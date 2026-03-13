"""
Welth — Chronos Forecasting Service
Amazon's Chronos-T5 zero-shot time series forecasting model via HuggingFace

Install:
  pip install fastapi uvicorn chronos-forecasting torch numpy

Run:
  uvicorn chronos_service:app --port 8001 --reload
"""

import json
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import torch

app = FastAPI(title="Welth Chronos Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model once at startup ────────────────────────────────────────────────
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        try:
            from chronos import ChronosPipeline
            pipeline = ChronosPipeline.from_pretrained(
                "amazon/chronos-t5-small",  # small = faster, good enough for monthly data
                device_map="cpu",           # use "cuda" if GPU available
                torch_dtype=torch.float32,
            )
            print("✅ Chronos model loaded")
        except Exception as e:
            print(f"❌ Failed to load Chronos: {e}")
            raise
    return pipeline


# ── Request schemas ───────────────────────────────────────────────────────────
class ForecastRequest(BaseModel):
    values: List[float]          # historical monthly values (expenses/income)
    horizon: int = 3             # months to forecast
    label: str = "expenses"      # for labelling output


class ForecastPoint(BaseModel):
    month_index: int
    low:   float  # 10th percentile
    mid:   float  # 50th percentile (median)
    high:  float  # 90th percentile


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": "amazon/chronos-t5-small"}


# ── Main forecast endpoint ────────────────────────────────────────────────────
@app.post("/chronos/forecast")
def forecast(req: ForecastRequest):
    if len(req.values) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 data points")
    if req.horizon < 1 or req.horizon > 12:
        raise HTTPException(status_code=400, detail="Horizon must be 1–12")

    try:
        pipe = get_pipeline()

        # Chronos expects a tensor of shape [1, T]
        context = torch.tensor(req.values, dtype=torch.float32).unsqueeze(0)

        # Generate samples — num_samples=50 gives good percentile estimates
        forecast_samples = pipe.predict(
            context,
            prediction_length=req.horizon,
            num_samples=50,
            temperature=1.0,
            top_k=50,
            top_p=1.0,
        )
        # forecast_samples shape: [1, num_samples, horizon]
        samples = forecast_samples[0].numpy()  # [50, horizon]

        points = []
        for h in range(req.horizon):
            col = samples[:, h]
            points.append(ForecastPoint(
                month_index=h + 1,
                low=  float(np.percentile(col, 10)),
                mid=  float(np.percentile(col, 50)),
                high= float(np.percentile(col, 90)),
            ))

        # Trend vs last actual
        last_actual = req.values[-1]
        next_month  = points[0].mid
        trend       = "increasing" if next_month > last_actual * 1.05 else \
                      "decreasing" if next_month < last_actual * 0.95 else "stable"

        return {
            "label":     req.label,
            "horizon":   req.horizon,
            "history":   req.values,
            "forecast":  [p.dict() for p in points],
            "trend":     trend,
            "next_mid":  round(next_month, 2),
            "next_low":  round(points[0].low, 2),
            "next_high": round(points[0].high, 2),
            "model":     "amazon/chronos-t5-small",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Batch forecast (income + expense together) ────────────────────────────────
class BatchForecastRequest(BaseModel):
    monthly_income:  List[float]
    monthly_expense: List[float]
    horizon: int = 3


@app.post("/chronos/batch")
def batch_forecast(req: BatchForecastRequest):
    income_fc  = forecast(ForecastRequest(values=req.monthly_income,  horizon=req.horizon, label="income"))
    expense_fc = forecast(ForecastRequest(values=req.monthly_expense, horizon=req.horizon, label="expenses"))

    # Predicted savings per month
    savings_forecast = []
    for i in range(req.horizon):
        inc = income_fc["forecast"][i]["mid"]
        exp = expense_fc["forecast"][i]["mid"]
        savings_forecast.append({
            "month_index": i + 1,
            "income_mid":  round(inc, 2),
            "expense_mid": round(exp, 2),
            "savings_mid": round(max(0, inc - exp), 2),
        })

    return {
        "income":   income_fc,
        "expenses": expense_fc,
        "savings":  savings_forecast,
        "model":    "amazon/chronos-t5-small",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)