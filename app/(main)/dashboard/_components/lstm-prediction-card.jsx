"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function LSTMPredictionCard() {
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    fetch("/api/ml/lstm-predict")
      .then(res => res.json())
      .then(data => setPrediction(data.predicted_expense));
  }, []);

  if (!prediction) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 AI Expense Forecast (LSTM)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          ₹{prediction}
        </p>
        <p className="text-xs text-muted-foreground">
          Predicted using Deep Learning
        </p>
      </CardContent>
    </Card>
  );
}