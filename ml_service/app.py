from fastapi import FastAPI
import psycopg2
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

load_dotenv()

app = FastAPI()

DATABASE_URL = os.getenv("DIRECT_URL")

def fetch_expense_data():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    query = """
        SELECT amount, date
        FROM transactions
        WHERE type = 'EXPENSE'
        ORDER BY date ASC;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    return df


def train_lstm(df):
    df["date"] = pd.to_datetime(df["date"])
    monthly = df.groupby(df["date"].dt.to_period("M"))["amount"].sum()
    monthly = monthly.reset_index()
    monthly["amount"] = monthly["amount"].astype(float)

    if len(monthly) < 4:
        return None, None, None

    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(monthly[["amount"]])

    X, y = [], []
    SEQ_LEN = 3

    for i in range(len(scaled) - SEQ_LEN):
        X.append(scaled[i:i+SEQ_LEN])
        y.append(scaled[i+SEQ_LEN])

    X, y = np.array(X), np.array(y)

    model = Sequential([
        LSTM(64, activation="relu", input_shape=(SEQ_LEN, 1)),
        Dense(1)
    ])

    model.compile(optimizer="adam", loss="mse")
    model.fit(X, y, epochs=30, verbose=0)

    return model, scaler, scaled[-SEQ_LEN:]


@app.get("/predict")
def predict_next_month():
    df = fetch_expense_data()

    if df.empty:
        return {"error": "No expense data"}

    model, scaler, last_sequence = train_lstm(df)

    if model is None:
        return {"error": "Not enough data for prediction"}

    last_sequence = last_sequence.reshape(1, 3, 1)
    prediction_scaled = model.predict(last_sequence)
    prediction = scaler.inverse_transform(prediction_scaled)

    return {
        "predicted_expense": round(float(prediction[0][0]), 2)
    }
