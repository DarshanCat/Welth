"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function NetWorthCard({ income, expenses }) {

  const netWorth = income - expenses;

  return (
    <Card className="p-6 shadow-md hover:shadow-xl transition">

      <CardContent>

        <h3 className="text-sm text-gray-500">
          Net Worth
        </h3>

        <div className="text-3xl font-bold mt-2">
          ₹{netWorth.toLocaleString()}
        </div>

      </CardContent>

    </Card>
  );
}