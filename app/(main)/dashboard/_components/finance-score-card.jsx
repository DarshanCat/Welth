"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function FinanceScoreCard({ score }) {
  let color = "text-red-500";
  let label = "Poor";

  if (score >= 70) {
    color = "text-green-600";
    label = "Excellent";
  } else if (score >= 40) {
    color = "text-yellow-500";
    label = "Good";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Financial Health Score</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className={`text-4xl font-bold ${color}`}>
            {score}/100
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
