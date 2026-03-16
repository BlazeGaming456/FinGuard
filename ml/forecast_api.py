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