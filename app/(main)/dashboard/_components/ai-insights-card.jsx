"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function AIInsightsCard() {
  return (

    <Card className="p-6">

      <CardContent>

        <h3 className="font-semibold mb-3">
          🤖 AI Insights
        </h3>

        <ul className="text-sm text-gray-600 space-y-2">

          <li>• Your food expenses increased 20%</li>

          <li>• You can save ₹3,200/month</li>

          <li>• Shopping is your highest category</li>

        </ul>

      </CardContent>

    </Card>
  );
}