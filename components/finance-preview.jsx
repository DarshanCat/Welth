"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", expense: 400 },
  { month: "Feb", expense: 800 },
  { month: "Mar", expense: 600 },
  { month: "Apr", expense: 1200 },
  { month: "May", expense: 900 },
];

export default function FinancePreview() {
  return (
    <section className="py-24 bg-gray-50">

      <div className="container mx-auto px-4">

        <h2 className="text-4xl font-bold text-center mb-12">
          Smart Financial Insights
        </h2>

        <div className="bg-white p-8 rounded-xl shadow-lg">

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="expense"
                stroke="#3b82f6"
                strokeWidth={3}
              />

            </LineChart>
          </ResponsiveContainer>

        </div>

      </div>

    </section>
  );
}