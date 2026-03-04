"use client";

// ✅ INR formatter
const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export function GoalsCard({ goals }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="text-lg font-semibold">🎯 Savings Goals</h2>

      {goals.map((goal) => {
        const progress = Math.min(
          Math.round((goal.currentSavings / goal.targetAmount) * 100),
          100
        );

        return (
          <div key={goal.id} className="space-y-2">
            {/* Header */}
            <div className="flex justify-between text-sm font-medium">
              <span>Target: {formatINR(goal.targetAmount)}</span>
              <span>{progress}% completed</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded">
              <div
                className={`h-2 rounded transition-all ${
                  goal.isBehind ? "bg-red-500" : "bg-green-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Savings info */}
            <p className="text-xs text-gray-600">
              Saved {formatINR(goal.currentSavings)} of{" "}
              {formatINR(goal.targetAmount)}
            </p>

            {/* 🚨 ALERT */}
            {goal.isBehind && (
              <p className="text-xs font-medium text-red-600">
                ⚠️ You are behind by{" "}
                {formatINR(goal.expectedSavings - goal.currentSavings)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
