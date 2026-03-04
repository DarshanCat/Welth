import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.callbacks import EarlyStopping

X = np.load("model/X.npy")
y = np.load("model/y.npy")

model = Sequential([
    LSTM(64, activation="relu", input_shape=(X.shape[1], 1)),
    Dense(1)
])

model.compile(
    optimizer="adam",
    loss="mse"
)

model.fit(
    X, y,
    epochs=50,
    batch_size=8,
    validation_split=0.2,
    callbacks=[EarlyStopping(patience=5)]
)

model.save("model/lstm_expense.h5")
print("✅ LSTM model trained & saved")
