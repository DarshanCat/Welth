"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  ShieldAlert, 
  ArrowRight,
  Activity,
  Zap
} from "lucide-react";

export default function TradingPlannerPage() {
  const [capital, setCapital] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("high");
  const [loading, setLoading] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [error, setError] = useState(null);

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (!capital || isNaN(capital) || Number(capital) < 100) {
      setError("Please enter a valid capital amount (Minimum $100)");
      return;
    }

    setLoading(true);
    setError(null);
    setPlanData(null);

    try {
      const response = await fetch("/api/ml/trading-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capital: Number(capital),
          risk_tolerance: riskTolerance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate plan (Status: ${response.status})`);
      }

      const data = await response.json();
      setPlanData(data);
    } catch (err) {
      setError(err.message || "An error occurred connecting to the AI engine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <Zap className="h-8 w-8 text-blue-600 dark:text-blue-500" />
          AI Trading Planner
        </h1>
        <p className="text-muted-foreground text-lg">
          Generate an aggressive, AI-driven weekly portfolio.
        </p>
      </div>

      {/* Extreme Risk Warning */}
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-xl p-6 shadow-sm dark:shadow-lg dark:shadow-red-500/5">
        <div className="flex gap-4">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-red-600 dark:text-red-500 font-bold text-lg mb-2">CRITICAL RISK WARNING</h3>
            <p className="text-red-800 dark:text-red-200/80 leading-relaxed text-sm">
              This planner targets highly aggressive returns (~10% weekly) utilizing volatile assets like options, levered ETFs, and crypto. 
              <strong> A guaranteed 10% weekly return is impossible.</strong> These strategies carry an extremely high risk of total capital loss. 
              Only use capital you are fully prepared to lose. This is for educational and theoretical demonstration purposes only.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              Plan Parameters
            </h2>
            
            <form onSubmit={handleGeneratePlan} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Investment Capital ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input 
                    type="number" 
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-3 pl-8 pr-4 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Enter amount (Min $100)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Risk Profile</label>
                <select 
                  value={riskTolerance}
                  onChange={(e) => setRiskTolerance(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg py-3 px-4 text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                >
                  <option value="high">Aggressive (Target 10%+, Max Risk)</option>
                  <option value="medium">Moderate (Not available for high-yield mode)</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-500/30">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Generate AI Plan
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2">
          {planData ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <p className="text-muted-foreground text-sm font-medium mb-1">Target Weekly Return</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    +{planData.target_weekly_return_pct}%
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <p className="text-muted-foreground text-sm font-medium mb-1">Total Capital</p>
                  <p className="text-3xl font-black text-foreground">
                    ${planData.total_capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm col-span-2 md:col-span-1">
                  <p className="text-muted-foreground text-sm font-medium mb-1">AI Engine</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate">
                    {planData.model}
                  </p>
                </div>
              </div>

              {/* Asset List */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Recommended Portfolio Strategy
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {planData.plan.map((asset, idx) => (
                    <div key={idx} className="bg-muted/40 border border-border rounded-xl p-5 hover:border-foreground/20 transition-colors group">
                      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-bold text-foreground">{asset.asset}</h4>
                            <span className="bg-background text-muted-foreground text-xs px-2 py-1 rounded-md border border-border">
                              {asset.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{asset.rationale}</p>
                        </div>
                        <div className="text-left md:text-right shrink-0">
                          <p className="text-sm text-muted-foreground mb-1">Allocation</p>
                          <p className="text-xl font-bold text-foreground">
                            ${asset.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm text-muted-foreground font-normal ml-1">({asset.allocation_pct}%)</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Simulated Entry</p>
                          <p className="font-medium text-foreground">${asset.entry_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Target Price</p>
                          <p className="font-medium text-emerald-600 dark:text-emerald-400">${asset.target_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            Stop Loss <ShieldAlert className="h-3 w-3 text-red-500 dark:text-red-400" />
                          </p>
                          <p className="font-medium text-red-600 dark:text-red-400">${asset.stop_loss.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="h-full min-h-[400px] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-muted/20">
              <Target className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Awaiting Parameters</h3>
              <p className="text-muted-foreground max-w-sm">
                Enter your investment capital and risk profile on the left to generate an aggressive AI trading strategy.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
