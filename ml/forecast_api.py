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

    #Filling any gaps in the date range so that Prophet can see a complete calendar
    full_range = pd.date_range(
        start=monthly["ds"].min(),
        end=monthly["ds"].max(),
        freq="MS"
    )

    monthly = (
        monthly.set_index("ds").reindex(full_range, fill_value=0).rename_axis("ds").reset_index()
    )

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
) -> dict:
    #i. Extract mean & std from historical transactions
    exp_forecast = expense_fc["forecast"]
    inc_forecast = income_fc["forecast"]

    exp_means = np.array([r["yhat"] for r in exp_forecast[:horizon]])
    exp_stds = np.array([(r["yhat_upper"] - r["yhat_lower"])/2 for r in exp_forecast[:horizon]])

    inc_means = np.array([r["yhat"] for r in inc_forecast[:horizon]])
    inc_stds = np.array([(r["yhat_upper"] - r["yhat_lower"])/2 for r in inc_forecast[:horizon]])

    #ii. Run simulations
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

    #iii. Output metrics
    final_savings = all_savings_paths[:, -1] #Savings at the end of the horizon

    #Risk of going broke at any point during the simulation
    went_negative = np.any(all_savings_paths<0,axis=1) #Checks if it becomes false at any point in the row
    risk_of_deficit = float(np.mean(went_negative))

    #Months until savings hit zero (Job loss scenario)
    months_survivable = None
    if (job_loss_months > 0):
        first_negative = []
        for sim in range(n_simulation):
            neg_months = np.where(all_savings_paths[sim] < 0)[0] #np.where() return tuple of values, where the first element return the array of indices
            if (len(neg_months) > 0):
                first_negative.append(neg_months[0])
            else:
                first_negative.append(horizon)
        months_survivable = float(np.mean(first_negative))

    #Big purchase affordability
    afford_probability = None
    if (target_purchase > 0):
        target_idx = min(target_months-1, horizon-1)
        savings_at_target = all_savings_paths[:, target_idx]
        afford_probability = float(np.mean(savings_at_target >= target_purchase)) #Mean of the boolean values gives probability

    #Percentile outcomes
    p5 = float(np.percentile(final_savings, 5))
    p25 = float(np.percentile(final_savings, 25))
    p50 = float(np.percentile(final_savings, 50))
    p75 = float(np.percentile(final_savings, 75))
    p95 = float(np.percentile(final_savings, 95))

    #Sample paths for frontend chart (1000 points will not be as smooth)
    sample_paths = all_savings_paths[
        np.random.choice(n_simulation, size=100, replace=False)
    ].tolist()

    #Interpretation layer
    interpretations = []

    interpretations.append({
        "type": "risk_of_deficit",
        "severity": "high" if risk_of_deficit > 0.3 else "medium" if risk_of_deficit > 0.1 else "low",
        "message": f"There is a {risk_of_deficit*100}% probability your savings will drop below ₹0 in the next {horizon} months."
    })

    interpretations.append({
        "type": "median_outcome",
        "severity": "low",
        "message": f"Median projected savings after {horizon} months: ₹{p50}"
    })

    interpretations.append({
        "type": "worst_case",
        "severity": "high",
        "message": f"Worst-case scenario (5th percentile): ₹{p5}"
    })

    interpretations.append({
        "type": "best_case",
        "severity": "low",
        "message": f"Best-case scenario (95th percentile): ₹{p95}"
    })

    if months_survivable is not None:
        interpretations.append({
            "type": "job_loss_survival",
            "severity": "high" if months_survivable < 3 else "medium",
            "message": f"Without income, your savings would last approximately {months_survivable} months on average."
        })

    if afford_probability is not None:
        interpretations.append({
            "type": "purchase_affordability",
            "severity": "low" if afford_probability > 0.7 else "medium" if afford_probability > 0.4 else "high",
            "message": f"You have a {afford_probability*100}% chance of affording ₹{target_purchase} within {target_months} months."
        })
    
    return {
        "status": "ok",
        "n_simulations": n_simulation,
        "horizon_months": horizon,
        "percentile": {
            "p5": p5,
            "p25": p25,
            "p50": p50,
            "p75": p75,
            "p95": p95
        },
        "var": {
            "var_95": float(current_savings-p5),
            "var_75": float(current_savings-p25),
        },
        "risk_of_deficit": risk_of_deficit,
        "months_survivable": months_survivable,
        "afford_probability": afford_probability,
        "sample_paths": sample_paths,
        "interpretations": interpretations,
    }

@app.post("/simulate")
def run_simulations(body: dict):
    current_savings = body.get("current_savings", 0)
    horizon = body.get("horizon", 0)
    job_loss_months = body.get("job_loss_months", 0)
    target_purchase = body.get("target_purchase", 0)
    target_months = body.get("target_months", 6)

    if not 1 <= horizon <= 12:
        raise HTTPException(status_code=400, detail="Horizon must be between 1 and 12")
    
    try:
        df = fetch_transactions()
    except Exception as e:
        logger.error(f"DB error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    expense_monthly = aggregate_monthly(df, "DEBIT")
    income_monthly = aggregate_monthly(df, "CREDIT")

    expense_result = train_and_forecast(expense_monthly, horizon, "DEBIT")
    income_result = train_and_forecast(income_monthly, horizon, "CREDIT")

    if (expense_result["status"] != "ok" or income_result["status"] != "ok"):
        raise HTTPException(status_code=400, detail="Insufficient data for simulation")
    
    result = monte_carlo_simulation(
        expense_fc = expense_result,
        income_fc = income_result,
        current_savings = current_savings,
        horizon = horizon,
        job_loss_months = job_loss_months,
        target_purchase = target_purchase,
        target_months = target_months,
    )

    return result