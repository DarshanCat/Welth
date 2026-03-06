"use client";

import { useEffect, useState } from "react";

export default function LSTMDemo() {
  const [prediction, setPrediction] = useState(1200);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrediction((prev) => prev + Math.floor(Math.random() * 50 - 25));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24">

      <div className="container mx-auto px-4 text-center">

        <h2 className="text-4xl font-bold mb-8">
          AI Expense Forecast
        </h2>

        <div className="text-6xl font-bold text-blue-600 animate-pulse">

          ₹{prediction}

        </div>

        <p className="text-gray-600 mt-4">
          Predicted next month expenses using LSTM Deep Learning
        </p>

      </div>

    </section>
  );
}