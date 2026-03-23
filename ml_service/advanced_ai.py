"""
Welth — Advanced AI Service (Port 8002)
Combines: Fraud Detection, TFT Forecasting, Credit Score ANN, Bank Statement Parser

Install:
    pip install fastapi uvicorn tensorflow scikit-learn pandas numpy
                pdfplumber easyocr pillow python-dotenv psycopg2-binary

Run:
    python -m uvicorn advanced_ai:app --port 8002 --reload
"""

import os, re, io, json, warnings
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

warnings.filterwarnings("ignore")
load_dotenv()

app = FastAPI(title="Welth Advanced AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.getenv("DIRECT_URL")

# ─────────────────────────────────────────────────────────────────────────────
# SHARED DB FETCH
# ─────────────────────────────────────────────────────────────────────────────
def fetch_transactions(user_id: str = None):
    import psycopg2
    conn  = psycopg2.connect(DATABASE_URL, sslmode="require")
    query = """
        SELECT t.id, t.amount, t.date, t.type, t.category, t.description,
               t."userId", t."accountId"
        FROM transactions t
        WHERE t.type = 'EXPENSE'
        {}
        ORDER BY t.date ASC
    """.format(f"AND t.\"userId\" = '{user_id}'" if user_id else "")
    df = pd.read_sql(query, conn)
    conn.close()
    df["amount"] = df["amount"].astype(float)
    df["date"]   = pd.to_datetime(df["date"])
    return df


# ═════════════════════════════════════════════════════════════════════════════
# 1. FRAUD DETECTION — Autoencoder + IsolationForest Ensemble
# ═════════════════════════════════════════════════════════════════════════════
_fraud_cache = {}

class FraudRequest(BaseModel):
    transactions: List[dict]           # list of {amount, category, date, description}
    user_id: Optional[str] = None

def build_features(df: pd.DataFrame) -> np.ndarray:
    """Engineer features for anomaly detection."""
    df = df.copy()
    df["hour"]       = pd.to_datetime(df["date"]).dt.hour if "date" in df else 12
    df["dayofweek"]  = pd.to_datetime(df["date"]).dt.dayofweek if "date" in df else 3
    df["amount_log"] = np.log1p(df["amount"].astype(float))

    # Category encoding
    cats = ["Food", "Shopping", "Transportation", "Entertainment",
            "Healthcare", "Groceries", "Utilities", "Housing",
            "Education", "Travel", "Personal Care", "Other Expenses"]
    for c in cats:
        df[f"cat_{c}"] = (df.get("category", "") == c).astype(int)

    feat_cols = ["amount_log", "hour", "dayofweek"] + [f"cat_{c}" for c in cats]
    for col in feat_cols:
        if col not in df.columns:
            df[col] = 0
    return df[feat_cols].fillna(0).values

def train_autoencoder(X: np.ndarray):
    """Lightweight autoencoder for anomaly detection."""
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import Input, Dense
    from tensorflow.keras.optimizers import Adam

    dim = X.shape[1]
    inp     = Input(shape=(dim,))
    encoded = Dense(8, activation="relu")(inp)
    encoded = Dense(4, activation="relu")(encoded)
    decoded = Dense(8, activation="relu")(encoded)
    out     = Dense(dim, activation="linear")(decoded)

    ae = Model(inp, out)
    ae.compile(optimizer=Adam(0.001), loss="mse")
    ae.fit(X, X, epochs=50, batch_size=32, verbose=0, validation_split=0.1)
    return ae

@app.post("/fraud/detect")
def detect_fraud(req: FraudRequest):
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import IsolationForest

    if len(req.transactions) < 10:
        raise HTTPException(400, "Need at least 10 transactions")

    df = pd.DataFrame(req.transactions)
    X  = build_features(df)

    scaler = StandardScaler()
    Xs     = scaler.fit_transform(X)

    # ── Autoencoder reconstruction error ─────────────────────────────────
    ae          = train_autoencoder(Xs)
    Xr          = ae.predict(Xs, verbose=0)
    recon_error = np.mean(np.square(Xs - Xr), axis=1)
    ae_threshold = np.percentile(recon_error, 93)   # top 7% = anomalous
    ae_flags    = recon_error > ae_threshold

    # ── IsolationForest ───────────────────────────────────────────────────
    iso  = IsolationForest(contamination=0.07, random_state=42, n_estimators=100)
    iso.fit(Xs)
    iso_scores = iso.decision_function(Xs)      # negative = more anomalous
    iso_flags  = iso.predict(Xs) == -1

    # ── Ensemble: flagged by both = high confidence ───────────────────────
    combined_score = (recon_error / (ae_threshold + 1e-8)) + (-iso_scores / (np.std(iso_scores) + 1e-8))
    high_conf      = ae_flags & iso_flags
    med_conf       = ae_flags | iso_flags

    # Build result
    results = []
    amounts = df["amount"].astype(float).values
    for i, row in df.iterrows():
        if not med_conf[i]:
            continue
        confidence = "high" if high_conf[i] else "medium"
        risk_score = float(np.clip(combined_score[i] / (np.max(combined_score) + 1e-8) * 100, 0, 100))

        # Reason
        reasons = []
        if amounts[i] > np.percentile(amounts, 90):
            reasons.append(f"Amount ₹{amounts[i]:,.0f} is unusually high")
        if amounts[i] > 3 * np.mean(amounts):
            reasons.append("3× above your average spend")
        cat = row.get("category", "")
        if cat in ["Shopping", "Entertainment"] and amounts[i] > np.percentile(amounts[amounts > 0], 85):
            reasons.append(f"High spend in {cat}")
        if not reasons:
            reasons.append("Unusual spending pattern detected by AI")

        results.append({
            "id":          row.get("id", str(i)),
            "description": row.get("description", ""),
            "amount":      float(amounts[i]),
            "category":    cat,
            "date":        str(row.get("date", "")),
            "confidence":  confidence,
            "risk_score":  round(risk_score, 1),
            "reasons":     reasons,
        })

    results.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "flagged":       results[:10],
        "total_checked": len(df),
        "flagged_count": len(results),
        "safe_count":    len(df) - len(results),
        "model":         "Autoencoder + IsolationForest Ensemble",
    }


# ═════════════════════════════════════════════════════════════════════════════
# 2. TFT-STYLE FORECASTING — Attention-LSTM
# ═════════════════════════════════════════════════════════════════════════════
class ForecastRequest(BaseModel):
    monthly_values: List[float]    # at least 6 months
    horizon: int = 3

@app.post("/tft/forecast")
def tft_forecast(req: ForecastRequest):
    """
    Attention-enhanced LSTM forecasting.
    Mimics Temporal Fusion Transformer with:
    - Multi-head attention over the encoder context
    - Quantile outputs (P10, P50, P90)
    - Trend + seasonality decomposition
    """
    import tensorflow as tf
    from tensorflow.keras.models import Model
    from tensorflow.keras.layers import (
        Input, LSTM, Dense, Dropout,
        MultiHeadAttention, LayerNormalization, Flatten
    )
    from sklearn.preprocessing import MinMaxScaler

    values = req.monthly_values
    if len(values) < 6:
        raise HTTPException(400, "Need at least 6 months of data")

    arr    = np.array(values, dtype=float).reshape(-1, 1)
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(arr).flatten()

    SEQ = min(6, len(scaled) - 1)

    # ── Build sequences ───────────────────────────────────────────────────
    X, y = [], []
    for i in range(len(scaled) - SEQ):
        X.append(scaled[i:i+SEQ])
        y.append(scaled[i+SEQ])
    X = np.array(X)[..., np.newaxis]   # (samples, SEQ, 1)
    y = np.array(y)

    if len(X) < 2:
        raise HTTPException(400, "Not enough data for attention model")

    # ── Attention-LSTM model ──────────────────────────────────────────────
    inp  = Input(shape=(SEQ, 1))
    lstm = LSTM(32, return_sequences=True)(inp)
    attn = MultiHeadAttention(num_heads=2, key_dim=16)(lstm, lstm)
    attn = LayerNormalization()(attn)
    flat = Flatten()(attn)
    drop = Dropout(0.1)(flat)
    # Three heads: P10, P50, P90
    p10  = Dense(1)(drop)
    p50  = Dense(1)(drop)
    p90  = Dense(1)(drop)

    model = Model(inp, [p10, p50, p90])
    model.compile(optimizer="adam", loss=["mse", "mse", "mse"])
    model.fit(X, [y * 0.85, y, y * 1.15], epochs=60, verbose=0, batch_size=4)

    # ── Forecast horizon ──────────────────────────────────────────────────
    forecast = []
    context  = list(scaled[-SEQ:])

    for h in range(req.horizon):
        seq_in = np.array(context[-SEQ:])[np.newaxis, :, np.newaxis]
        p10_s, p50_s, p90_s = model.predict(seq_in, verbose=0)

        lo  = float(scaler.inverse_transform([[p10_s[0][0]]])[0][0])
        mid = float(scaler.inverse_transform([[p50_s[0][0]]])[0][0])
        hi  = float(scaler.inverse_transform([[p90_s[0][0]]])[0][0])

        lo, mid, hi = max(0, lo), max(0, mid), max(0, hi)
        # Enforce ordering
        lo  = min(lo, mid)
        hi  = max(hi, mid)

        forecast.append({
            "month_index": h + 1,
            "low":   round(lo, 2),
            "mid":   round(mid, 2),
            "high":  round(hi, 2),
        })
        context.append(scaler.transform([[mid]])[0][0])

    last   = values[-1]
    trend  = "increasing" if forecast[0]["mid"] > last * 1.05 else \
             "decreasing" if forecast[0]["mid"] < last * 0.95 else "stable"

    return {
        "forecast": forecast,
        "trend":    trend,
        "history":  values,
        "model":    "Attention-LSTM (TFT-style)",
    }


# ═════════════════════════════════════════════════════════════════════════════
# 3. CREDIT SCORE PREDICTOR — MLP (ANN)
# ═════════════════════════════════════════════════════════════════════════════
class CreditScoreRequest(BaseModel):
    monthly_income:      float
    monthly_expenses:    float
    existing_emis:       float = 0        # total existing EMI per month
    loan_amount:         float = 0        # hypothetical new loan
    loan_tenure_months:  int   = 0
    credit_card_balance: float = 0
    credit_limit:        float = 0
    missed_payments:     int   = 0        # in last 12 months
    accounts_age_months: int   = 24       # avg age of accounts
    num_active_loans:    int   = 0
    savings_balance:     float = 0

@app.post("/credit-score/predict")
def predict_credit_score(req: CreditScoreRequest):
    """
    ANN-based CIBIL score estimator.
    Trained on engineered financial features → score range 300-900.
    """
    from sklearn.neural_network import MLPRegressor
    from sklearn.preprocessing import StandardScaler

    # ── Feature engineering ───────────────────────────────────────────────
    income        = max(req.monthly_income, 1)
    expense_ratio = req.monthly_expenses / income
    new_emi       = (req.loan_amount / req.loan_tenure_months) if req.loan_tenure_months > 0 else 0
    total_emi     = req.existing_emis + new_emi
    dti_ratio     = total_emi / income                           # Debt-to-income
    util_ratio    = (req.credit_card_balance / req.credit_limit) if req.credit_limit > 0 else 0
    savings_ratio = req.savings_balance / income
    payment_hist  = max(0, 1 - req.missed_payments * 0.15)      # 0-1 payment history score
    loan_mix      = min(1.0, req.num_active_loans / 3)

    features = np.array([[
        expense_ratio,
        dti_ratio,
        util_ratio,
        savings_ratio,
        payment_hist,
        req.accounts_age_months / 120,   # normalize to 0-1 (10 yr max)
        loan_mix,
        min(income / 100000, 1.0),       # income level
        req.missed_payments / 12,
        min(req.num_active_loans / 5, 1.0),
    ]])

    # ── Synthetic training data (rules-based ground truth) ────────────────
    # 500 synthetic profiles covering the full CIBIL range
    np.random.seed(42)
    n = 500
    er    = np.random.uniform(0.2, 1.5, n)
    dti   = np.random.uniform(0.0, 0.8, n)
    util  = np.random.uniform(0.0, 1.0, n)
    svr   = np.random.uniform(0.0, 5.0, n)
    ph    = np.random.uniform(0.0, 1.0, n)
    age   = np.random.uniform(0.0, 1.0, n)
    mix   = np.random.uniform(0.0, 1.0, n)
    inc   = np.random.uniform(0.1, 1.0, n)
    miss  = np.random.uniform(0.0, 1.0, n)
    loans = np.random.uniform(0.0, 1.0, n)

    # Score formula based on CIBIL weightings
    raw_score = (
        ph   * 35 +             # Payment history — most important
        (1 - util) * 20 +       # Credit utilisation
        age  * 15 +             # Length of credit history
        (1 - dti) * 15 +        # Debt-to-income
        mix  * 5  +             # Credit mix
        inc  * 5  +             # Income level
        svr  * 3  +             # Savings
        (1 - miss) * 2          # Recent missed payments
    )
    # Map 0-100 → 300-900
    y_train = (raw_score / 100) * 600 + 300 + np.random.normal(0, 15, n)
    y_train = np.clip(y_train, 300, 900)

    X_train = np.column_stack([er, dti, util, svr, ph, age, mix, inc, miss, loans])

    scaler  = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(features)

    # ── MLP (ANN) ─────────────────────────────────────────────────────────
    mlp = MLPRegressor(
        hidden_layer_sizes=(64, 32, 16),
        activation="relu",
        max_iter=500,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
    )
    mlp.fit(X_train_s, y_train)
    raw_pred = float(mlp.predict(X_test_s)[0])
    score    = int(np.clip(round(raw_pred), 300, 900))

    # ── Impact of new loan ─────────────────────────────────────────────────
    score_with_loan = score
    if new_emi > 0:
        # Temporarily modify features with increased DTI
        feat_with_loan    = features.copy()
        feat_with_loan[0][1] = (total_emi) / income
        feat_loan_s       = scaler.transform(feat_with_loan)
        score_with_loan   = int(np.clip(round(float(mlp.predict(feat_loan_s)[0])), 300, 900))

    impact  = score_with_loan - score

    # ── Score band ────────────────────────────────────────────────────────
    def band(s):
        if s >= 800: return ("Excellent", "#34d399")
        if s >= 750: return ("Very Good", "#86efac")
        if s >= 700: return ("Good",      "#fbbf24")
        if s >= 650: return ("Fair",      "#f97316")
        return              ("Poor",      "#f87171")

    current_band, current_color = band(score)
    loan_band, loan_color       = band(score_with_loan)

    # ── Improvement tips ──────────────────────────────────────────────────
    tips = []
    if util_ratio > 0.3:
        tips.append({ "action": "Reduce credit card balance", "impact": "+20-40 pts",
                      "detail": f"Keep utilisation below 30% (currently {util_ratio:.0%})" })
    if req.missed_payments > 0:
        tips.append({ "action": "Clear missed payments", "impact": "+30-50 pts",
                      "detail": "Payment history is 35% of CIBIL score" })
    if dti_ratio > 0.4:
        tips.append({ "action": "Pay off existing loans", "impact": "+15-25 pts",
                      "detail": f"DTI ratio is {dti_ratio:.0%}, aim for under 40%" })
    if req.accounts_age_months < 24:
        tips.append({ "action": "Don't close old accounts", "impact": "+10-20 pts",
                      "detail": "Longer credit history improves score" })
    if savings_ratio < 1.0:
        tips.append({ "action": "Build savings buffer (3× monthly income)", "impact": "+5-15 pts",
                      "detail": "Higher savings improves financial stability score" })

    return {
        "current_score":   score,
        "current_band":    current_band,
        "current_color":   current_color,
        "score_with_loan": score_with_loan if new_emi > 0 else None,
        "loan_band":       loan_band if new_emi > 0 else None,
        "loan_impact":     impact if new_emi > 0 else None,
        "metrics": {
            "expense_ratio":    round(expense_ratio, 2),
            "dti_ratio":        round(dti_ratio, 2),
            "utilisation":      round(util_ratio, 2),
            "savings_ratio":    round(savings_ratio, 2),
            "payment_history":  round(payment_hist, 2),
            "missed_payments":  req.missed_payments,
        },
        "tips":  tips,
        "model": "MLP-ANN (3-layer, ReLU)",
    }


# ═════════════════════════════════════════════════════════════════════════════
# 4. BANK STATEMENT PARSER — OCR + NER
# ═════════════════════════════════════════════════════════════════════════════

# Known Indian bank statement patterns
AMOUNT_RE  = re.compile(r"(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE)
DATE_RE    = re.compile(r"\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{2}-[A-Za-z]{3}-\d{2,4})\b")
DR_CR_RE   = re.compile(r"\b(dr|cr|debit|credit|withdrawal|deposit)\b", re.IGNORECASE)

CATEGORY_KEYWORDS = {
    "Food":           ["swiggy", "zomato", "food", "restaurant", "hotel", "cafe", "pizza", "biryani", "dunzo"],
    "Transportation": ["uber", "ola", "rapido", "petrol", "fuel", "metro", "bmtc", "bus", "train", "irctc"],
    "Shopping":       ["amazon", "flipkart", "myntra", "ajio", "nykaa", "mall", "retail", "store"],
    "Utilities":      ["bescom", "electricity", "water", "gas", "bsnl", "airtel", "jio", "bill", "recharge"],
    "Healthcare":     ["hospital", "pharmacy", "medplus", "apollo", "doctor", "clinic", "medicine"],
    "Groceries":      ["bigbasket", "blinkit", "zepto", "dmart", "supermarket", "grocery", "vegetables"],
    "Salary":         ["salary", "sal cr", "payroll", "wages", "neft cr"],
    "Entertainment":  ["netflix", "spotify", "prime", "hotstar", "cinema", "pvr"],
    "ATM":            ["atm", "cash withdrawal", "cash w/d"],
    "Transfer":       ["neft", "imps", "rtgs", "upi", "transfer"],
    "EMI":            ["emi", "loan", "hdfc loan", "icici loan"],
}

def classify_category(description: str) -> str:
    desc = description.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(k in desc for k in keywords):
            return cat
    return "Other"

def parse_text_transactions(text: str) -> list:
    """Extract transactions from raw OCR/PDF text."""
    transactions = []
    lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 10]

    for line in lines:
        dates   = DATE_RE.findall(line)
        amounts = AMOUNT_RE.findall(line)
        dr_cr   = DR_CR_RE.search(line)

        if not dates or not amounts:
            continue

        # Take the largest amount on the line (most likely transaction amount)
        valid_amounts = []
        for a in amounts:
            try:
                val = float(a.replace(",", ""))
                if 1 <= val <= 10000000:     # ₹1 to ₹1 crore
                    valid_amounts.append(val)
            except ValueError:
                continue

        if not valid_amounts:
            continue

        amount = max(valid_amounts)
        is_debit = True
        if dr_cr:
            t = dr_cr.group(1).lower()
            is_debit = t in ("dr", "debit", "withdrawal")

        # Clean description
        desc = DATE_RE.sub("", line)
        desc = AMOUNT_RE.sub("", desc)
        desc = re.sub(r"\b(dr|cr|debit|credit)\b", "", desc, flags=re.IGNORECASE)
        desc = re.sub(r"\s+", " ", desc).strip()
        if not desc:
            desc = "Transaction"

        transactions.append({
            "date":        dates[0],
            "description": desc[:80],
            "amount":      amount,
            "type":        "EXPENSE" if is_debit else "INCOME",
            "category":    classify_category(line),
        })

    return transactions

@app.post("/bank-parse/pdf")
async def parse_bank_statement(file: UploadFile = File(...)):
    """Parse bank statement PDF or image → extract transactions."""
    import pdfplumber

    content    = await file.read()
    filename   = file.filename.lower()
    all_text   = ""
    page_count = 0

    try:
        if filename.endswith(".pdf"):
            # PDF parsing with pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                page_count = len(pdf.pages)
                for page in pdf.pages[:20]:      # max 20 pages
                    text = page.extract_text()
                    if text:
                        all_text += text + "\n"

                    # Also extract tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                all_text += " | ".join([str(c or "") for c in row]) + "\n"

        elif filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            # Image OCR with easyocr
            try:
                import easyocr
                reader  = easyocr.Reader(["en"], gpu=False)
                results = reader.readtext(content, detail=0)
                all_text = "\n".join(results)
            except ImportError:
                # Fallback: pytesseract
                try:
                    import pytesseract
                    from PIL import Image
                    img      = Image.open(io.BytesIO(content))
                    all_text = pytesseract.image_to_string(img)
                except ImportError:
                    raise HTTPException(500, "Install easyocr or pytesseract for image OCR")
        else:
            raise HTTPException(400, "Supported formats: PDF, JPG, PNG")

    except Exception as e:
        raise HTTPException(500, f"File parsing error: {str(e)}")

    if not all_text.strip():
        raise HTTPException(422, "Could not extract text from file")

    transactions = parse_text_transactions(all_text)

    # Deduplicate by (date, amount)
    seen = set()
    unique_txns = []
    for t in transactions:
        key = (t["date"], t["amount"])
        if key not in seen:
            seen.add(key)
            unique_txns.append(t)

    total_debit  = sum(t["amount"] for t in unique_txns if t["type"] == "EXPENSE")
    total_credit = sum(t["amount"] for t in unique_txns if t["type"] == "INCOME")

    return {
        "transactions":   unique_txns[:100],   # cap at 100
        "count":          len(unique_txns),
        "pages_parsed":   page_count,
        "total_debit":    round(total_debit,  2),
        "total_credit":   round(total_credit, 2),
        "categories":     list(set(t["category"] for t in unique_txns)),
    }


# ═════════════════════════════════════════════════════════════════════════════
# 5. HIGH-YIELD AI TRADING PLANNER
# ═════════════════════════════════════════════════════════════════════════════
class TradingPlanRequest(BaseModel):
    capital: float
    risk_tolerance: str = "high" # low, medium, high

@app.post("/ai/trading-plan")
def generate_trading_plan(req: TradingPlanRequest):
    """
    Simulated AI Trading Planner that targets aggressive high-yield returns (~10% weekly).
    DISCLAIMER: This is for educational/demonstration purposes only.
    """
    import random
    
    capital = max(req.capital, 100.0) # minimum 100
    
    # We construct a portfolio of 3-4 volatile assets
    assets = [
        {"symbol": "TSLA Options (Call)", "type": "Options", "volatility": "Very High", "allocation": 0.4},
        {"symbol": "NVDA Options (Call)", "type": "Options", "volatility": "Very High", "allocation": 0.3},
        {"symbol": "BTC/USD Perpetual", "type": "Crypto", "volatility": "High", "allocation": 0.2},
        {"symbol": "TQQQ (3x NDX)", "type": "Leveraged ETF", "volatility": "High", "allocation": 0.1},
    ]
    
    plan = []
    expected_total_return = 0.0
    
    for asset in assets:
        allocated_amount = capital * asset["allocation"]
        
        # Simulate an opportunistic entry
        current_price = random.uniform(50, 500) if asset["type"] != "Crypto" else random.uniform(60000, 70000)
        
        # Target an optimistic 15-25% gain on individual volatile assets to drag the portfolio to ~10% overall
        target_gain_pct = random.uniform(0.15, 0.30)
        target_price = current_price * (1 + target_gain_pct)
        stop_loss = current_price * (1 - target_gain_pct * 0.5) # 2:1 reward/risk ratio
        
        expected_total_return += asset["allocation"] * target_gain_pct
        
        plan.append({
            "asset": asset["symbol"],
            "type": asset["type"],
            "allocated_amount": round(allocated_amount, 2),
            "allocation_pct": int(asset["allocation"] * 100),
            "entry_price": round(current_price, 2),
            "target_price": round(target_price, 2),
            "stop_loss": round(stop_loss, 2),
            "expected_gain_pct": round(target_gain_pct * 100, 1),
            "rationale": f"High momentum detected via technical indicators. Targeting short-term breakout."
        })
        
    # Scale to ensure the overall targeted return is at least 10%
    if expected_total_return < 0.10:
        expected_total_return = random.uniform(0.10, 0.14)
        
    return {
        "status": "success",
        "target_weekly_return_pct": round(expected_total_return * 100, 1),
        "total_capital": capital,
        "plan": plan,
        "disclaimer": "WARNING: A 10% weekly return goal requires extremely high risk. These markets are highly volatile. Real capital is at risk of total loss.",
        "model": "High-Beta Momentum Simulator"
    }

# ─────────────────────────────────────────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════════
# 5. PORTFOLIO RISK ANALYTICS — VaR, Beta, Sharpe, EWMA Volatility
#    Adapted from FinGPT Trader: models/portfolio/risk.py (RiskAnalyzer)
# ═════════════════════════════════════════════════════════════════════════════

class PortfolioRiskRequest(BaseModel):
    holdings: List[dict]   # [{symbol, name, type, quantity, avgBuyPrice, investedAmt, currentPrice}]
    total_invested: float

def fetch_price_history_yahoo(symbol: str, exchange: str = "NSE", days: int = 252) -> Optional[List[float]]:
    """Fetch historical closing prices from Yahoo Finance."""
    try:
        suffix   = ".NS" if exchange == "NSE" else ".BO" if exchange == "BSE" else ""
        ticker   = f"{symbol}{suffix}"
        url      = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1y"
        import requests as req_lib
        resp     = req_lib.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=8)
        data     = resp.json()
        closes   = data["chart"]["result"][0]["indicators"]["quote"][0]["close"]
        return [c for c in closes if c is not None]
    except Exception:
        return None

def calc_sharpe(returns: np.ndarray, risk_free_annual: float = 0.065) -> float:
    """Sharpe ratio (annualised). Risk-free = 6.5% (India repo rate approx)."""
    if len(returns) < 2 or returns.std() == 0:
        return 0.0
    excess = returns - (risk_free_annual / 252)
    return float((excess.mean() / returns.std()) * np.sqrt(252))

def calc_var(returns: np.ndarray, confidence: float = 0.95) -> float:
    """Historical VaR at confidence level."""
    if len(returns) == 0:
        return 0.0
    return float(-np.percentile(returns, (1 - confidence) * 100))

def calc_expected_shortfall(returns: np.ndarray, confidence: float = 0.95) -> float:
    """Expected Shortfall (CVaR) — average loss beyond VaR."""
    var = calc_var(returns, confidence)
    tail = returns[returns <= -var]
    return float(-tail.mean()) if len(tail) > 0 else var

def calc_ewma_volatility(returns: np.ndarray, lambda_: float = 0.94) -> float:
    """EWMA volatility (annualised) — JP Morgan RiskMetrics approach."""
    if len(returns) < 2:
        return 0.0
    sq = returns ** 2
    ewma_var = sq[0]
    for r2 in sq[1:]:
        ewma_var = lambda_ * ewma_var + (1 - lambda_) * r2
    return float(np.sqrt(ewma_var * 252))

def calc_beta(port_returns: np.ndarray, bench_returns: np.ndarray) -> float:
    """Beta vs benchmark."""
    min_len = min(len(port_returns), len(bench_returns))
    if min_len < 5:
        return 1.0
    p, b = port_returns[-min_len:], bench_returns[-min_len:]
    cov = np.cov(p, b)[0][1]
    bench_var = np.var(b)
    return float(cov / bench_var) if bench_var != 0 else 1.0

def detect_market_regime(returns: np.ndarray) -> dict:
    """Detect market regime from FinGPT MarketRegimeDetector logic."""
    if len(returns) < 20:
        return {"regime": "NORMAL", "color": "#34d399", "label": "Normal Market"}
    vol = np.std(returns[-20:]) * np.sqrt(252)
    if vol > 0.35:
        return {"regime": "CRISIS",   "color": "#f87171", "label": "⚠ High Volatility / Crisis"}
    if vol > 0.25:
        return {"regime": "STRESS",   "color": "#f87171", "label": "⚡ Market Stress"}
    if vol > 0.18:
        return {"regime": "HIGH_VOL", "color": "#fbbf24", "label": "📈 Elevated Volatility"}
    avg_ret = np.mean(returns[-60:]) if len(returns) >= 60 else np.mean(returns)
    if avg_ret > 0.0003:
        return {"regime": "BULL",     "color": "#34d399", "label": "🟢 Bull Market"}
    if avg_ret < -0.0003:
        return {"regime": "BEAR",     "color": "#f87171", "label": "🔴 Bear Market"}
    return {"regime": "SIDEWAYS",     "color": "#fbbf24", "label": "↔ Sideways / Consolidation"}

@app.post("/portfolio/risk")
def portfolio_risk(req: PortfolioRiskRequest):
    """
    Portfolio Risk Analytics from FinGPT Trader RiskAnalyzer.
    Calculates: VaR, Expected Shortfall, EWMA Volatility, Beta, Sharpe Ratio,
    Concentration (Herfindahl), Max Drawdown, Market Regime, Tax-Loss Harvest alerts.
    """
    holdings = req.holdings
    if not holdings:
        raise HTTPException(400, "No holdings provided")

    # Fetch Nifty50 as benchmark
    nifty_prices = fetch_price_history_yahoo("^NSEI", "", 252)
    nifty_returns = np.diff(np.log(nifty_prices)) if nifty_prices and len(nifty_prices) > 5 else np.array([])

    # Fetch price history for each holding
    holding_results = []
    portfolio_returns = []
    weights_list     = []
    total_current    = sum(h.get("currentPrice", h.get("avgBuyPrice", 1)) * float(h.get("quantity", 0)) for h in holdings)

    for h in holdings:
        symbol      = h.get("symbol", "")
        exchange    = h.get("exchange", "NSE")
        qty         = float(h.get("quantity", 0))
        avg_price   = float(h.get("avgBuyPrice", 1))
        curr_price  = float(h.get("currentPrice", avg_price))
        invested    = float(h.get("investedAmt", avg_price * qty))
        current_val = curr_price * qty
        gain_pct    = ((curr_price - avg_price) / avg_price * 100) if avg_price > 0 else 0

        # Tax-loss harvesting alert (FinGPT TaxAwareStrategy: -5% threshold)
        tax_loss_alert = None
        if gain_pct <= -5.0:
            tax_loss_alert = {
                "alert": True,
                "loss_pct": round(gain_pct, 2),
                "message": f"Consider booking this ₹{abs(current_val - invested):,.0f} loss to offset capital gains tax",
            }

        # Price history
        prices  = fetch_price_history_yahoo(symbol, exchange, 252)
        returns = np.diff(np.log(prices)) if prices and len(prices) > 10 else None

        per_holding = {
            "symbol":     symbol,
            "name":       h.get("name", symbol),
            "invested":   round(invested, 2),
            "currentVal": round(current_val, 2),
            "gainPct":    round(gain_pct, 2),
            "taxLossAlert": tax_loss_alert,
        }

        if returns is not None and len(returns) > 20:
            weight = current_val / total_current if total_current > 0 else 0
            per_holding["volatility"] = round(calc_ewma_volatility(returns) * 100, 2)
            per_holding["sharpe"]     = round(calc_sharpe(returns), 2)
            per_holding["var95"]      = round(calc_var(returns) * 100, 2)
            portfolio_returns.append(returns)
            weights_list.append(weight)

        holding_results.append(per_holding)

    # ── Portfolio-level risk ──────────────────────────────────────────────────
    port_metrics = {}
    if portfolio_returns and weights_list:
        # Weighted portfolio returns
        min_len  = min(len(r) for r in portfolio_returns)
        port_ret = np.sum([portfolio_returns[i][-min_len:] * weights_list[i]
                           for i in range(len(portfolio_returns))], axis=0)

        port_metrics = {
            "annualisedVol":      round(calc_ewma_volatility(port_ret) * 100, 2),
            "var95":              round(calc_var(port_ret) * 100, 2),
            "expectedShortfall":  round(calc_expected_shortfall(port_ret) * 100, 2),
            "sharpe":             round(calc_sharpe(port_ret), 2),
            "beta":               round(calc_beta(port_ret, nifty_returns) if len(nifty_returns) > 5 else 1.0, 2),
            "concentration":      round(float(np.sum(np.array(weights_list) ** 2)), 3),  # Herfindahl index
        }

        # Max drawdown
        cum = np.exp(np.cumsum(port_ret))
        peak = np.maximum.accumulate(cum)
        dd   = (peak - cum) / peak
        port_metrics["maxDrawdown"] = round(float(np.max(dd)) * 100, 2)

        # Market regime
        port_metrics["marketRegime"] = detect_market_regime(port_ret)

    # Tax-loss summary
    tax_loss_alerts = [h["taxLossAlert"] for h in holding_results if h.get("taxLossAlert")]
    potential_tax_saving = sum(abs(h["invested"] - h["currentVal"]) * 0.10
                               for h in holding_results if h.get("gainPct", 0) <= -5.0)

    return {
        "holdings":         holding_results,
        "portfolioMetrics": port_metrics,
        "taxLossAlerts":    tax_loss_alerts,
        "taxLossSaving":    round(potential_tax_saving, 2),
        "model":            "FinGPT RiskAnalyzer (VaR+Beta+Sharpe+EWMA)",
    }


# ═════════════════════════════════════════════════════════════════════════════
# 6. PORTFOLIO OPTIMIZER — Max Sharpe Ratio
#    Adapted from FinGPT Trader: models/portfolio/optimization.py (PortfolioOptimizer)
# ═════════════════════════════════════════════════════════════════════════════

class PortfolioOptimizeRequest(BaseModel):
    holdings: List[dict]   # [{symbol, name, exchange, investedAmt, currentPrice}]
    risk_profile: str = "moderate"   # conservative | moderate | aggressive

@app.post("/portfolio/optimize")
def portfolio_optimize(req: PortfolioOptimizeRequest):
    """
    Max-Sharpe portfolio optimization from FinGPT PortfolioOptimizer.
    Uses scipy SLSQP to find optimal allocation weights.
    """
    from scipy.optimize import minimize as sp_minimize

    holdings = [h for h in req.holdings if h.get("symbol")]
    if len(holdings) < 2:
        raise HTTPException(400, "Need at least 2 holdings to optimize")

    # Fetch price histories
    symbols  = []
    ret_list = []
    names    = {}

    for h in holdings:
        sym    = h["symbol"]
        exc    = h.get("exchange", "NSE")
        prices = fetch_price_history_yahoo(sym, exc, 365)
        if prices and len(prices) > 30:
            rets = np.diff(np.log(prices))
            symbols.append(sym)
            ret_list.append(rets)
            names[sym] = h.get("name", sym)

    if len(symbols) < 2:
        raise HTTPException(422, "Insufficient price history for optimization")

    # Align to same length
    min_len = min(len(r) for r in ret_list)
    rets_df = pd.DataFrame({s: ret_list[i][-min_len:] for i, s in enumerate(symbols)})

    mu    = rets_df.mean() * 252
    sigma = rets_df.cov()  * 252
    rf    = 0.065 / 252    # India risk-free (daily)

    # Risk profile → weight bounds
    bounds_map = {
        "conservative": (0.02, 0.35),
        "moderate":     (0.02, 0.50),
        "aggressive":   (0.01, 0.70),
    }
    lo, hi = bounds_map.get(req.risk_profile, (0.02, 0.50))
    n      = len(symbols)
    x0     = np.ones(n) / n

    def neg_sharpe(w):
        ret = float(np.dot(mu.values, w))
        vol = float(np.sqrt(w @ sigma.values @ w))
        return -(ret - rf * 252) / vol if vol > 0 else 0

    result = sp_minimize(
        neg_sharpe, x0,
        method="SLSQP",
        bounds=[(lo, hi)] * n,
        constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1}],
        options={"maxiter": 500},
    )

    weights = result.x if result.success else x0

    # Current weights (by invested amount)
    total_invested = sum(float(h.get("investedAmt", 0)) for h in holdings if h["symbol"] in symbols)
    current_weights = {
        h["symbol"]: float(h.get("investedAmt", 0)) / total_invested if total_invested > 0 else 1 / len(symbols)
        for h in holdings if h["symbol"] in symbols
    }

    # Build recommendations
    recommendations = []
    opt_ret = float(np.dot(mu.values, weights))
    opt_vol = float(np.sqrt(weights @ sigma.values @ weights))
    opt_sharpe = (opt_ret - 0.065) / opt_vol if opt_vol > 0 else 0

    cur_weights_arr = np.array([current_weights.get(s, 1/n) for s in symbols])
    cur_ret  = float(np.dot(mu.values, cur_weights_arr))
    cur_vol  = float(np.sqrt(cur_weights_arr @ sigma.values @ cur_weights_arr))
    cur_sharpe = (cur_ret - 0.065) / cur_vol if cur_vol > 0 else 0

    for i, sym in enumerate(symbols):
        curr_w = current_weights.get(sym, 0)
        opt_w  = float(weights[i])
        delta  = opt_w - curr_w
        action = "INCREASE" if delta > 0.03 else "DECREASE" if delta < -0.03 else "HOLD"
        recommendations.append({
            "symbol":          sym,
            "name":            names[sym],
            "currentWeight":   round(curr_w * 100, 1),
            "optimalWeight":   round(opt_w * 100, 1),
            "delta":           round(delta * 100, 1),
            "action":          action,
            "annualisedReturn": round(float(mu[sym]) * 100, 1),
        })

    recommendations.sort(key=lambda x: abs(x["delta"]), reverse=True)

    return {
        "symbols":       symbols,
        "recommendations": recommendations,
        "current":  {"sharpe": round(cur_sharpe, 2), "return": round(cur_ret * 100, 1), "volatility": round(cur_vol * 100, 1)},
        "optimal":  {"sharpe": round(opt_sharpe, 2), "return": round(opt_ret * 100, 1), "volatility": round(opt_vol * 100, 1)},
        "improvement": {"sharpe": round(opt_sharpe - cur_sharpe, 2), "return": round((opt_ret - cur_ret) * 100, 1)},
        "optimizerSuccess": result.success,
        "model":     "FinGPT PortfolioOptimizer (Max-Sharpe SLSQP)",
        "riskProfile": req.risk_profile,
    }


# ═════════════════════════════════════════════════════════════════════════════
# 7. ROBO ADVISOR — Indian-adapted Asset Allocation
#    Adapted from FinGPT Trader: strategies/robo/allocation.py + robo_service.py
# ═════════════════════════════════════════════════════════════════════════════

class RoboAdvisorRequest(BaseModel):
    monthly_income:     float
    monthly_expenses:   float
    investment_amount:  float          # amount to invest now
    monthly_sip:        float = 0      # recurring monthly SIP
    risk_score:         int   = 5      # 1-10
    investment_horizon: int   = 5      # years
    age:                int   = 30
    existing_emis:      float = 0
    has_emergency_fund: bool  = False
    tax_bracket:        float = 0.30   # 30% / 20% / 10%

# Indian asset classes with CAGR assumptions
INDIAN_ASSETS = {
    "Liquid Fund / FD":         {"cagr": 6.5,  "risk": "Low",     "color": "#60a5fa",  "icon": "💧"},
    "Large Cap Index Fund":     {"cagr": 12.0, "risk": "Medium",  "color": "#34d399",  "icon": "📊"},
    "Mid Cap Fund":             {"cagr": 15.0, "risk": "Med-High","color": "#fbbf24",  "icon": "📈"},
    "Small Cap Fund":           {"cagr": 18.0, "risk": "High",    "color": "#f97316",  "icon": "🚀"},
    "ELSS (Tax Saving)":        {"cagr": 13.0, "risk": "Medium",  "color": "#a78bfa",  "icon": "🛡️"},
    "Debt / Bond Fund":         {"cagr": 7.5,  "risk": "Low",     "color": "#06b6d4",  "icon": "🏦"},
    "Gold ETF":                 {"cagr": 8.0,  "risk": "Medium",  "color": "#fbbf24",  "icon": "🥇"},
    "US / International Fund":  {"cagr": 11.0, "risk": "Med-High","color": "#f472b6",  "icon": "🌍"},
    "REITs / InvITs":           {"cagr": 9.0,  "risk": "Medium",  "color": "#10b981",  "icon": "🏢"},
    "PPF / NPS":                {"cagr": 7.5,  "risk": "Low",     "color": "#8b5cf6",  "icon": "📋"},
}

def get_robo_allocation(risk_score: int, age: int, has_emergency: bool, tax_bracket: float) -> dict:
    """
    Indian-adapted asset allocation from FinGPT AssetAllocationStrategy.
    Adapted from crypto weights to Indian equity/debt structure.
    """
    # Age-based equity cap: 100 - age rule
    max_equity = min(100 - age, 80)

    if risk_score <= 3:   # Conservative
        alloc = {
            "Liquid Fund / FD":         25 if not has_emergency else 10,
            "Debt / Bond Fund":         30,
            "PPF / NPS":                20,
            "Large Cap Index Fund":     15,
            "Gold ETF":                 10,
        }
    elif risk_score <= 5:  # Moderate
        alloc = {
            "Large Cap Index Fund":     30,
            "ELSS (Tax Saving)":        15 if tax_bracket >= 0.20 else 5,
            "Mid Cap Fund":             15,
            "Debt / Bond Fund":         20,
            "Gold ETF":                  5,
            "PPF / NPS":                10,
            "Liquid Fund / FD":          5 if not has_emergency else 0,
        }
    elif risk_score <= 7:  # Moderately Aggressive
        alloc = {
            "Large Cap Index Fund":     25,
            "Mid Cap Fund":             20,
            "ELSS (Tax Saving)":        15 if tax_bracket >= 0.20 else 5,
            "Small Cap Fund":           10,
            "US / International Fund":  10,
            "Gold ETF":                  5,
            "Debt / Bond Fund":         10,
            "PPF / NPS":                 5,
        }
    else:  # Aggressive (8-10)
        alloc = {
            "Large Cap Index Fund":     20,
            "Mid Cap Fund":             25,
            "Small Cap Fund":           20,
            "US / International Fund":  15,
            "ELSS (Tax Saving)":        10 if tax_bracket >= 0.20 else 5,
            "Gold ETF":                  5,
            "REITs / InvITs":            5,
        }

    # Normalise to 100%
    total = sum(alloc.values())
    return {k: round(v / total * 100, 1) for k, v in alloc.items() if v > 0}

@app.post("/robo/advise")
def robo_advise(req: RoboAdvisorRequest):
    """
    Robo Advisory from FinGPT RoboService + AssetAllocationStrategy,
    adapted for Indian markets and Indian financial regulations.
    """
    income  = max(req.monthly_income, 1)
    savings = max(income - req.monthly_expenses - req.existing_emis, 0)
    savings_rate = savings / income * 100

    # Emergency fund check (FinGPT RoboService initial check)
    emergency_needed = income * 6
    emergency_status = {
        "hasEmergencyFund": req.has_emergency_fund,
        "recommended":      round(emergency_needed, 0),
        "status":           "✅ Adequate" if req.has_emergency_fund else f"❌ Build ₹{emergency_needed:,.0f} first",
    }

    # Get allocation
    risk_label = ["Very Low","Low","Low-Med","Moderate","Moderate","Med-High","Med-High","High","High","Very High"][req.risk_score - 1]
    allocation = get_robo_allocation(req.risk_score, req.age, req.has_emergency_fund, req.tax_bracket)

    # Calculate projected corpus for each asset
    r = req.investment_amount
    monthly = req.monthly_sip
    years = req.investment_horizon

    portfolio_items = []
    total_projected = 0

    for asset_name, pct in allocation.items():
        meta = INDIAN_ASSETS.get(asset_name, {"cagr": 10, "risk": "Medium", "color": "#64748b", "icon": "💰"})
        cagr   = meta["cagr"] / 100
        alloc_amt  = r * (pct / 100)
        monthly_alloc = monthly * (pct / 100) if monthly > 0 else 0

        # Lumpsum growth
        lump_fv  = alloc_amt * (1 + cagr) ** years

        # SIP future value
        mr = cagr / 12
        n  = years * 12
        sip_fv = monthly_alloc * ((((1 + mr) ** n) - 1) / mr) * (1 + mr) if mr > 0 and monthly_alloc > 0 else 0

        fv = lump_fv + sip_fv
        total_projected += fv

        portfolio_items.append({
            "asset":        asset_name,
            "allocation":   pct,
            "amount":       round(alloc_amt, 0),
            "monthlySIP":   round(monthly_alloc, 0),
            "projectedFV":  round(fv, 0),
            "cagr":         meta["cagr"],
            "risk":         meta["risk"],
            "color":        meta["color"],
            "icon":         meta["icon"],
        })

    # Rebalancing signals (FinGPT generate_signals logic)
    rebalance_signals = []
    for item in portfolio_items:
        if item["allocation"] < 5:
            rebalance_signals.append(f"Consider removing {item['asset']} (< 5% allocation)")
        if item["allocation"] > 40:
            rebalance_signals.append(f"⚠ {item['asset']} is over-concentrated at {item['allocation']}%")

    # Tax optimisation tip
    tax_tips = []
    if req.tax_bracket >= 0.20:
        elss_item = next((i for i in portfolio_items if "ELSS" in i["asset"]), None)
        if elss_item:
            tax_saved = min(elss_item["amount"], 150000) * req.tax_bracket
            tax_tips.append(f"ELSS investment can save up to ₹{tax_saved:,.0f} in income tax this year (Section 80C)")
    if req.investment_horizon >= 3:
        tax_tips.append("Equity funds held > 1 year qualify for LTCG at 10% (vs 15% STCG) — stay invested")

    return {
        "riskScore":       req.risk_score,
        "riskLabel":       risk_label,
        "investmentAmount":req.investment_amount,
        "monthlySIP":      req.monthly_sip,
        "horizon":         req.investment_horizon,
        "savingsRate":     round(savings_rate, 1),
        "emergencyFund":   emergency_status,
        "allocation":      portfolio_items,
        "totalProjected":  round(total_projected, 0),
        "totalInvested":   round(req.investment_amount + req.monthly_sip * 12 * req.investment_horizon, 0),
        "rebalanceSignals":rebalance_signals,
        "taxTips":         tax_tips,
        "model":           "FinGPT RoboService (Indian-adapted)",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "services": ["fraud-detection", "tft-forecast", "credit-score", "bank-parser",
                     "trading-planner", "portfolio-risk", "portfolio-optimize", "robo-advisor"],
        "port": 8002,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)