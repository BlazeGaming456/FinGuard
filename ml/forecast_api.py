#For reading environment variables
import os
#For logging
import logging
#For ignoring small warnings caused by prophet
import warnings
import numpy as np
import pandas as pd
#For the API server
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prophet import Prophet
#For connection with the postgresql database
import psycopg2
from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FinGuard Forecast")

app.add_middleware (
    CORSMiddleware,
    allow_origins = ['http://localhost:3000'],
    allow_credentials = True,
    allow_methods = ['*'],
    allow_headers = ['*'],
)

#1. Creating connection and fetching data from the database

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def fetch_transactions() -> pd.DataFrame:
    conn = get_db_connection()
    try:
        query = 'SELECT date, amount, type, category FROM "Transactions" ORDER BY date'
        df = pd.read_sql(query, conn)
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"])  # drop any rows where date failed to parse
        return df
    finally:
        conn.close()

#2. Data Preparation

def aggregate_monthly(df: pd.DataFrame, tx_type: str) -> pd.DataFrame:
    #Fill missing months with 0
    filtered = df[df["type"] == tx_type].copy()
    if (filtered.empty):
        return pd.DataFrame(columns=["ds","y"])
    
    monthly = (
        filtered.resample("MS", on="date")["amount"].sum().reset_index()
    )
    monthly.columns = ["ds", "y"]

    # #Filling any gaps in the date range so that Prophet can see a complete calendar
    # full_range = pd.date_range(
    #     start=monthly["ds"].min(),
    #     end=monthly["ds"].max(),
    #     freq="MS"
    # )

    # monthly = (
    #     monthly.set_index("ds").reindex(full_range, fill_value=0).rename_axis("ds").reset_index()
    # )

    #Remove months with zero - these are gaps, not actual data
    monthly = monthly[monthly["y"] > 0]

    return monthly

def remove_outliers(df: pd.DataFrame, z_thresh: float = 2.5) -> pd.DataFrame:
    if (len(df) < 4):
        return df
    mean, std = df["y"].mean(), df["y"].std()
    if (std == 0):
        return df
    z_scores = (df["y"] - mean)/std
    df = df.copy()
    df.loc[z_scores.abs() > z_thresh, "y"] = mean + np.sign(z_scores[z_scores.abs() > z_thresh])*z_thresh*std
    return df

#3. Building the model

def build_model(yearly_seasonality: bool) -> Prophet:
    return Prophet(
        weekly_seasonality = False,
        daily_seasonality = False,
        yearly_seasonality = yearly_seasonality,
        changepoint_prior_scale = 0.05,
        seasonality_mode = "additive"
    )

def train_and_forecast(df: pd.DataFrame, horizon: int, label: str) -> dict:
    MIN_MONTHS = 6
    if (len(df) < MIN_MONTHS):
        return {
            "status": "insufficient data",
            "message": f"Need at least {MIN_MONTHS} months of {label} data (have {len(df)})",
        }
    
    yearly = len(df) >= 24
    df_clean = remove_outliers(df)

    #horizon corresponds to the number of predicted rows from the future
    model = build_model(yearly_seasonality=yearly)
    model.fit(df_clean)

    future = model.make_future_dataframe(periods=horizon, freq="MS")
    forecast = model.predict(future)

    #Historically fitted values
    #We extract the predicted values of the previosu months, and can compare the predicted and actual values
    historical = forecast[["ds","yhat"]].iloc[: len(df)].copy()
    historical["y_actual"] = df["y"].values
    historical["is_forecast"] = False
    
    #Future predictions
    future_fc = forecast[["ds","yhat","yhat_lower","yhat_upper"]].tail(horizon).copy()
    future_fc["is_forecast"] = True

    #Floor negative predictions to zero
    for col in ["yhat", "yhat_lower", "yhat_upper"]:
        future_fc[col] = future_fc[col].clip(lower=0)

    return {
        "status": "ok",
        #orient="records" converts each row into its own dictionary
        "historical": historical.to_dict(orient="records"),
        "forecast": future_fc.to_dict(orient="records"),
        "yearly_seasonality_used": yearly,
        "outliers_capped": int((df["y"] != df_clean["y"]).sum()),
    }

#4. Interpret the expense and income results

def interpret(expense_fc: dict, income_fc: dict) -> list[dict]:
    insights = []

    if expense_fc["status"] != "ok" or income_fc["status"]!="ok":
        return insights
    
    exp_vals = [r["yhat"] for r in expense_fc["forecast"]]
    inc_vals = [r["yhat"] for r in income_fc["forecast"]]

    #Expense trend
    exp_change_pct = ((exp_vals[-1]-exp_vals[0])/max(exp_vals[0],1))*100 #We don't want exp_vals[0] to be 0, as it would be division by zero
    if (exp_change_pct > 10):
        insights.append({
            "type": "expense_rising",
            "severity": "high" if (exp_change_pct > 25) else "medium",
            "message": f"Expenses are projected to rise {exp_change_pct}% over the forecast window"
        })
    elif (exp_change_pct < -10):
        insights.append({
            "type": "expense_falling",
            "severity": "low",
            "message": f"Expenses are projected to fall {abs(exp_change_pct)}% - good trajectory"
        })

    #Saving stress
    negative_months = sum(1 for i,e in enumerate(exp_vals) if inc_vals[i] and e>inc_vals[i])
    if (negative_months > 0):
        insights.append({
            "type": "savings_stress",
            "severity": "high",
            "message": f"Expenses may exceed income in {negative_months} of the next {len(exp_vals)} months."
        })
    
    #Widening confidence interval -> high volatility
    widths = [r["yhat_upper"] - r["yhat_lower"] for r in expense_fc["forecast"]]
    if (widths[-1] > widths[0]*1.5):
        insights.append({
            "type": "high_uncertainty",
            "severity": "medium",
            "message": "Forecast confidence interval widens significantly - your spending is irregular"
        })

    return insights

#5. Routes

@app.get("/forecast")
def generate_forecast(horizon: int=6):
    if not 1 <= horizon <= 12:
        raise HTTPException(status_code=400, detail="Horizon must be between 1 and 12")
    
    try:
        df = fetch_transactions()
    except Exception as e:
        logger.error(f"DB error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    if (df.empty):
        raise HTTPException(status_code=404, detail="No transactions found")
    
    expense_monthly = aggregate_monthly(df, "DEBIT")
    income_monthly = aggregate_monthly(df, "CREDIT")

    expense_result = train_and_forecast(expense_monthly, horizon, "DEBIT")
    income_result = train_and_forecast(income_monthly, horizon, "CREDIT")

    insights = interpret(expense_result, income_result)

    return {
        "expense": expense_result,
        "income": income_result,
        "insights": insights,
        "horizon_months": horizon,
    }

@app.get("/forecast/category")
def forecast_by_category(category:str, horizon:int=3):
    if not 1 <= horizon <= 12:
        raise HTTPException(status_code=400, detail="horizon must be between 1 and 12")
    
    try:
        df = fetch_transactions()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database conenction failed")

    cat_df = df[(df["type"] == "DEBIT") & (df["category"] == category.lower())]
    if cat_df.empty:
        raise HTTPException(status_code=404, detail=f"No data for category: {category}")
    
    monthly = aggregate_monthly(cat_df, "DEBIT")
    result = train_and_forecast(monthly, horizon, category)

    return {
        "category": category,
        **result
    }

@app.get("/health")
def health():
    return {
        "status": "ok"
    }

# Monte Carlo Simulation

def monte_carlo_simulation(
        expense_fc: dict,
        income_fc: dict,
        current_savings: float,
        n_simulation: int = 1000,
        horizon: int = 6,
        job_loss_months: int = 0,
        target_purchase: float = 0,
        target_months: int = 6,
        high_spending_multiplier: float = 1.0,
        reduced_income_multiplier: float = 1.0,
) -> dict:
    #i. Extract mean & std from historical transactions
    exp_forecast = expense_fc["forecast"]
    inc_forecast = income_fc["forecast"]

    exp_means = np.array([r["yhat"] for r in exp_forecast[:horizon]])
    exp_stds = np.array([(r["yhat_upper"] - r["yhat_lower"])/2 for r in exp_forecast[:horizon]])

    inc_means = np.array([r["yhat"] for r in inc_forecast[:horizon]])
    inc_stds = np.array([(r["yhat_upper"] - r["yhat_lower"])/2 for r in inc_forecast[:horizon]])

    #ii. Run simulations
    def run_scenario(inc_means, inc_stds, exp_means, exp_stds):
        all_savings_paths = np.zeros((n_simulation, horizon))

        for sim in range(n_simulation):
            savings = current_savings

            for month in range(horizon):
                #Ignore negative expense
                expense = max(0, np.random.normal(exp_means[month], exp_stds[month]))

                #In job loss scenario, zero income for specified months
                if (month < job_loss_months):
                    income = 0
                else:
                    income = max(0, np.random.normal(inc_means[month], inc_stds[month]))
                
                savings = savings + income - expense
                all_savings_paths[sim, month] = savings

        return all_savings_paths

    #Normal
    normal_paths = run_scenario(inc_means, inc_stds, exp_means, exp_stds)

    #Job Loss
    job_loss_paths = run_scenario(
        inc_means*0,
        inc_stds,
        exp_means,
        exp_stds
    ) if job_loss_months > 0 else normal_paths

    #High Spending
    high_spending_paths = run_scenario(
        inc_means,
        inc_stds,
        exp_means*high_spending_multiplier,
        exp_stds,
    )

    #Reduced Income
    reduced_income_paths = run_scenario(
        inc_means*reduced_income_multiplier,
        inc_stds,
        exp_means,
        exp_stds,
    )

    #iii. Output metrics
    def compute_metrics(paths):
        final_savings = paths[:, -1] #Savings at the end of the horizon

        #Percentile outcomes
        p5 = float(np.percentile(final_savings, 5))
        p25 = float(np.percentile(final_savings, 25))
        p50 = float(np.percentile(final_savings, 50))
        p75 = float(np.percentile(final_savings, 75))
        p95 = float(np.percentile(final_savings, 95))

        #VaR - How much you could lose from current savings
        var_95 = max(0,float(current_savings - p5))
        var_90 = max(0,float(current_savings - p25))

        #CVaR - Average of worst 5% outcomes
        worst_5_pct = final_savings[final_savings <= np.percentile(final_savings,5)]
        cvar_95 = max(0,float(current_savings - np.mean(worst_5_pct)) if len(worst_5_pct)>0 else 0.0)

        #Risk of going broke at any point during the simulation
        went_negative = np.any(paths<0,axis=1) #Checks if it becomes false at any point in the row
        risk_of_deficit = float(np.mean(went_negative))

        #Recovery probability - of those that went negative, how many recovered
        negative_sims = paths[went_negative]
        if len(negative_sims) > 0:
            recovered = np.sum(negative_sims[:,-1]>0)
            recovery_probability = float(recovered/len(negative_sims))
        else:
            recovery_probability = 1.0

        #Maximum drawdown - peak to trough per simulation, then average
        drawdowns = []
        for sim in range(n_simulation):
            path = paths[sim]
            peak = current_savings
            max_dd = 0
            for val in path:
                if (val > peak):
                    peak = val
                dd = peak - val
                if dd > max_dd:
                    max_dd = dd
            drawdowns.append(max_dd)
        avg_drawdown = float(np.mean(drawdowns))
        worst_drawdown = float(np.max(drawdowns))

        #Months until savings hit zero (Job loss scenario)
        months_survivable = None
        if (job_loss_months > 0):
            first_negative = []
            for sim in range(n_simulation):
                neg_months = np.where(paths[sim] < 0)[0] #np.where() return tuple of values, where the first element return the array of indices
                if (len(neg_months) > 0):
                    first_negative.append(neg_months[0])
                else:
                    first_negative.append(horizon)
            months_survivable = float(np.mean(first_negative))

        return {
            "percentiles": {"p5": p5, "p25": p25, "p50": p50, "p75": p75, "p95": p95},
            "var_95": var_95,
            "var_90": var_90,
            "cvar_95": cvar_95,
            "risk_of_deficit": risk_of_deficit,
            "recovery_probability": recovery_probability,
            "avg_drawdown": avg_drawdown,
            "worst_drawdown": worst_drawdown,
            "months_survivable": months_survivable,
        }

    #iv. Affordability timeline
    affordabilty_timeline = []
    if (target_purchase > 0):
        for month_idx in range(horizon):
            savings_at_month = normal_paths[:, month_idx]
            prob = float(np.mean(savings_at_month>=target_purchase))
            affordabilty_timeline.append({
                "month": month_idx+1,
                "probability": prob,
            })

    #v. Emergency fund recommendation
    #Based on average monthly expense, recommend 6 months buffer
    avg_monthly_expense = float(np.mean(exp_means))
    emergency_fund_target = avg_monthly_expense*6
    emergency_fund_gap = max(0,emergency_fund_target-current_savings)
    months_to_emergency_fund = None
    if emergency_fund_gap > 0:
        avg_monthly_savings = float(np.mean(inc_means) - np.mean(exp_means))
        if avg_monthly_savings > 0:
            months_to_emergency_fund = int(np.ceil(emergency_fund_gap/avg_monthly_savings))

    #vi. Safe spending limit
    #Binary search for maximum extra spend where the risk_of_deficit stays <20%
    def risk_at_extra_spend(extra):
        paths = run_scenario(
            inc_means,
            inc_stds,
            exp_means + extra,
            exp_stds,
        )
        return float(np.mean(np.any(paths<0,axis=1)))

    safe_extra_spend = 0
    low, high = 0, float(np.mean(inc_means))
    for _ in range(10): #10 iterations of binary search
        mid = (low + high)/2
        if (risk_at_extra_spend(mid) < 0.20):
            safe_extra_spend = mid
            low = mid
        else:
            high = mid

    #vii. Compute metrics for all scenarios
    normal_metrics = compute_metrics(normal_paths)
    job_loss_metrics = compute_metrics(job_loss_paths)
    high_spending_metrics = compute_metrics(high_spending_paths)
    reduced_income_metrics = compute_metrics(reduced_income_paths)

    #viii. Sample paths for frontend (100 paths only)
    sample_indices = np.random.choice(n_simulation, size=50, replace=False)
    sample_paths = normal_paths[sample_indices].tolist()

    #ix. Interpretation layer
    m = normal_metrics
    interpretations = [
        {
            "type": "risk_of_deficit",
            "severity": "high" if m["risk_of_deficit"] > 0.3 else "medium" if m["risk_of_deficit"] > 0.1 else "low",
            "message": f"There is a {m['risk_of_deficit']*100:.0f}% probability your savings will drop below ₹0 in the next {horizon} months."
        },
        {
            "type": "median_outcome",
            "severity": "low",
            "message": f"Median projected savings after {horizon} months: ₹{m['percentiles']['p50']:,.0f}"
        },
        {
            "type": "var",
            "severity": "medium",
            "message": f"95% Value at Risk: ₹{m['var_95']:,.0f} — you are unlikely to lose more than this."
        },
        {
            "type": "cvar",
            "severity": "high",
            "message": f"In the worst 5% of scenarios, average loss is ₹{m['cvar_95']:,.0f}."
        },
        {
            "type": "drawdown",
            "severity": "medium",
            "message": f"Worst-case drawdown: ₹{m['worst_drawdown']:,.0f} — the largest peak-to-trough drop across all simulations."
        },
        {
            "type": "recovery",
            "severity": "medium" if m["recovery_probability"] < 0.7 else "low",
            "message": f"Of scenarios where you go broke, {m['recovery_probability']*100:.0f}% recover by end of {horizon} months."
        },
        {
            "type": "emergency_fund",
            "severity": "high" if emergency_fund_gap > 0 else "low",
            "message": (
                f"Recommended emergency fund: ₹{emergency_fund_target:,.0f} (6 months of expenses). "
                f"You need ₹{emergency_fund_gap:,.0f} more."
                + (f" At your current savings rate, you'll reach this in {months_to_emergency_fund} months." if months_to_emergency_fund else "")
            )
        },
        {
            "type": "safe_spending",
            "severity": "low",
            "message": f"You can safely increase monthly spending by ₹{safe_extra_spend:,.0f} while keeping deficit risk below 20%."
        },
    ]

    #x. Afforability prediction
    if target_purchase > 0 and affordabilty_timeline:
        #Find first month where probabiltiy crosses 50%
        likely_month = next(
            (entry["month"] for entry in affordabilty_timeline if entry["probability"]>0.5),None
        )
        interpretations.append({
            "type": "affordability",
            "severity": "low" if likely_month and likely_month <= 3 else "medium",
            "message": (
                f"You are likely to afford ₹{target_purchase:,.0f} by month {likely_month}."
                if likely_month
                else f"Less than 50% chance of affording ₹{target_purchase:,.0f} within {horizon} months."
            )
        })
    
    return {
        "status": "ok",
        "n_simulations": n_simulation,
        "horizon_months": horizon,
        "sample_paths": sample_paths,
        "normal": normal_metrics,
        "job_loss": job_loss_metrics,
        "high_spending": high_spending_metrics,
        "reduced_income": reduced_income_metrics,
        "scenario_comparison": {
            "normal":         normal_metrics["percentiles"]["p50"],
            "job_loss":       job_loss_metrics["percentiles"]["p50"],
            "high_spending":  high_spending_metrics["percentiles"]["p50"],
            "reduced_income": reduced_income_metrics["percentiles"]["p50"],
        },
        "affordability_timeline": affordabilty_timeline,
        "emergency_fund": {
            "target":              emergency_fund_target,
            "gap":                 emergency_fund_gap,
            "months_to_reach":     months_to_emergency_fund,
        },
        "safe_extra_spend": safe_extra_spend,
        "interpretations": interpretations,
    }

@app.post("/simulate")
def run_simulations(body: dict):
    current_savings = body.get("current_savings", 0)
    horizon = int(body.get("horizon", 6))
    job_loss_months = body.get("job_loss_months", 0)
    target_purchase = body.get("target_purchase", 0)
    target_months = body.get("target_months", 6)
    high_spending_multiplier  = float(body.get("high_spending_multiplier", 1.3))
    reduced_income_multiplier = float(body.get("reduced_income_multiplier", 0.5))
    n_simulations             = int(body.get("n_simulations", 1000))

    if not 1 <= horizon <= 12:
        raise HTTPException(status_code=400, detail="Horizon must be between 1 and 12")
    if not 100 <= n_simulations <= 5000:
        raise HTTPException(status_code=400, detail="n_simulations must be between 100 and 5000")

    try:
        df = fetch_transactions()
    except Exception as e:
        logger.error(f"DB error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    expense_monthly = aggregate_monthly(df, "DEBIT")
    income_monthly = aggregate_monthly(df, "CREDIT")

    expense_result = train_and_forecast(expense_monthly, horizon, "DEBIT")
    income_result = train_and_forecast(income_monthly, horizon, "CREDIT")

    print("Expense forecast:", expense_result)
    print("Income forecast:", income_result)
    print("Expense monthly shape:", expense_monthly.shape)
    print("Income monthly shape:", income_monthly.shape)

    if (expense_result["status"] != "ok" or income_result["status"] != "ok"):
        raise HTTPException(status_code=400, detail="Insufficient data for simulation")
    
    result = monte_carlo_simulation(
        expense_fc                = expense_result,
        income_fc                 = income_result,
        current_savings           = current_savings,
        n_simulation             = n_simulations,
        horizon                   = horizon,
        job_loss_months           = job_loss_months,
        target_purchase           = target_purchase,
        target_months             = target_months,
        high_spending_multiplier  = high_spending_multiplier,
        reduced_income_multiplier = reduced_income_multiplier,
    )

    return result