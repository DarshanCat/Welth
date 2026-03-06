"use client";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export function GoalsCard({ goals }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="rounded-xl border p-5 space-y-5 bg-card text-card-foreground">
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
              <span className="text-muted-foreground">{progress}% completed</span>
            </div>

            {/* Progress track */}
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  goal.isBehind ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Savings info */}
            <p className="text-xs text-muted-foreground">
              Saved {formatINR(goal.currentSavings)} of{" "}
              {formatINR(goal.targetAmount)}
            </p>

            {/* Alert */}
            {goal.isBehind && (
              <p className="text-xs font-medium text-red-500">
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