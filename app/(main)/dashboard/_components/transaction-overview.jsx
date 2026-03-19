"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#8b5cf6",
  "#ec4899",
];

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

export function DashboardOverview({ accounts, transactions, upiId }) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?.id || accounts[0]?.id
  );

  const accountTransactions = transactions.filter(
    (t) => t.accountId === selectedAccountId
  );

  const recentTransactions = accountTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const currentDate = new Date();

  const currentMonthTransactions = accountTransactions.filter((t) => {
    const d = new Date(t.date);
    return (
      d.getMonth() === currentDate.getMonth() &&
      d.getFullYear() === currentDate.getFullYear()
    );
  });

  /* Expense Breakdown */

  const expensesByCategory = currentMonthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const expenseChartData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  /* Income Breakdown */

  const incomeByCategory = currentMonthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const incomeChartData = Object.entries(incomeByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">

      {/* Recent Transactions */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Recent Transactions
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-500">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               Live Sync
            </div>
          </CardTitle>

          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>

            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent className="space-y-4">

          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center">
              No transactions
            </p>
          ) : (
            recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-sm">
                    {t.description || "Untitled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(t.date), "PP")}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div
                    className={cn(
                      "flex items-center",
                      t.type === "EXPENSE"
                        ? "text-red-500"
                        : "text-green-600"
                    )}
                  >
                    {t.type === "EXPENSE" ? (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    )}
                    {formatINR(t.amount)}
                  </div>
                  {t.splitWith && upiId && t.type === "EXPENSE" && (
                    <Button 
                      variant="outline" 
                      className="h-6 text-[10px] px-2 py-0 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={() => {
                        const amt = (t.amount / 2).toFixed(2);
                        const link = `upi://pay?pa=${upiId}&am=${amt}&cu=INR`;
                        navigator.clipboard.writeText(link);
                        toast.success(`UPI Link copied for ₹${amt}`);
                      }}
                    >
                      Share UPI
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}

        </CardContent>
      </Card>

      {/* Expense Donut Chart */}

      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 w-full pb-10">

          {expenseChartData.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No expenses this month
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>

                <Pie
                  data={expenseChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  labelLine={false}
                  label={({ percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                >
                  {expenseChartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => formatINR(value)} />
                <Legend verticalAlign="bottom" height={130} wrapperStyle={{ paddingTop: '20px' }} />

              </PieChart>
            </ResponsiveContainer>
          )}

        </CardContent>
      </Card>

      {/* Income Donut Chart */}

      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 w-full pb-10">

          {incomeChartData.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No income this month
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>

                <Pie
                  data={incomeChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  labelLine={false}
                  label={({ percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                >
                  {incomeChartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => formatINR(value)} />
                <Legend verticalAlign="bottom" height={130} wrapperStyle={{ paddingTop: '20px' }} />

              </PieChart>
            </ResponsiveContainer>
          )}

        </CardContent>
      </Card>

    </div>
  );
}