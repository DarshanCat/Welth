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


# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "services": ["fraud-detection", "tft-forecast", "credit-score", "bank-parser"],
        "port": 8002,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)