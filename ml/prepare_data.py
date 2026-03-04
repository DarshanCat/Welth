import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import numpy as np
import pickle

# Load transactions CSV
df = pd.read_csv("transactions.csv")

# Use only EXPENSES
df = df[df["type"] == "EXPENSE"]

# Convert date & group monthly
df["date"] = pd.to_datetime(df["date"])
monthly = df.groupby(df["date"].dt.to_period("M"))["amount"].sum()
monthly = monthly.reset_index()
monthly["amount"] = monthly["amount"].astype(float)

# Normalize
scaler = MinMaxScaler()
scaled = scaler.fit_transform(monthly[["amount"]])

pickle.dump(scaler, open("model/scaler.pkl", "wb"))

# Create sequences
X, y = [], []
SEQ_LEN = 3

for i in range(len(scaled) - SEQ_LEN):
    X.append(scaled[i:i+SEQ_LEN])
    y.append(scaled[i+SEQ_LEN])

X, y = np.array(X), np.array(y)

np.save("model/X.npy", X)
np.save("model/y.npy", y)
