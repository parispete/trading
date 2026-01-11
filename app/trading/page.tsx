"use client";

/**
 * Trading Dashboard Page
 * Main interface for viewing stock data
 */

import { useState } from "react";
import { StockChart, WatchlistTable, SecuritySearch } from "@/modules/trading";
import { useDatabaseStatus, useSecuritySummary } from "@/modules/trading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Security, ChartConfig } from "@/modules/trading";

const PERIODS: ChartConfig["period"][] = [
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "MAX",
];

export default function TradingDashboard() {
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [chartPeriod, setChartPeriod] = useState<ChartConfig["period"]>("1Y");

  const { data: dbStatus, isLoading: dbLoading } = useDatabaseStatus();
  const { data: summary } = useSecuritySummary(selectedTicker);

  const handleSelectSecurity = (security: Security) => {
    setSelectedTicker(security.ticker);
  };

  const handleSelectFromWatchlist = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  // Show setup message if database is not initialized
  if (!dbLoading && dbStatus && !dbStatus.initialized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Database Not Initialized</CardTitle>
            <CardDescription>
              Run the data sourcing scripts to populate your database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The trading database has not been set up yet. Follow these steps
              to get started:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Navigate to the data-sourcing directory</li>
              <li>Create a virtual environment and install dependencies</li>
              <li>Add your Tiingo API key to .env</li>
              <li>Run the setup script</li>
            </ol>
            <div className="mt-4 p-3 bg-muted rounded-lg font-mono text-sm">
              <div>cd data-sourcing</div>
              <div>python -m venv .venv</div>
              <div>source .venv/bin/activate</div>
              <div>pip install -e .</div>
              <div>python scripts/setup_database.py</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          {dbStatus && (
            <p className="text-sm text-muted-foreground mt-1">
              {dbStatus.securities.toLocaleString()} securities •{" "}
              {dbStatus.priceRecords.toLocaleString()} price records
            </p>
          )}
        </div>
        <SecuritySearch
          onSelect={handleSelectSecurity}
          className="w-full sm:w-80"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Period Selector */}
          <div className="flex gap-2">
            {PERIODS.map((period) => (
              <Button
                key={period}
                variant={chartPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setChartPeriod(period)}
              >
                {period}
              </Button>
            ))}
          </div>

          {/* Chart */}
          <StockChart
            ticker={selectedTicker}
            config={{ period: chartPeriod, chartType: "area" }}
          />

          {/* Security Summary */}
          {summary && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {summary.ticker} - {summary.name || "Unknown"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Last Price
                    </div>
                    <div className="text-xl font-bold">
                      ${summary.lastPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Day Change
                    </div>
                    <div
                      className={cn(
                        "text-xl font-bold",
                        summary.dayChange >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {summary.dayChange >= 0 ? "+" : ""}
                      {summary.dayChangePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      52W High
                    </div>
                    <div className="text-xl font-bold">
                      ${summary.fiftyTwoWeekHigh.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      52W Low
                    </div>
                    <div className="text-xl font-bold">
                      ${summary.fiftyTwoWeekLow.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground">1 Week</div>
                    <div
                      className={cn(
                        "font-medium",
                        summary.weekChange >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {summary.weekChange >= 0 ? "+" : ""}
                      {summary.weekChangePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">1 Month</div>
                    <div
                      className={cn(
                        "font-medium",
                        summary.monthChange >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {summary.monthChange >= 0 ? "+" : ""}
                      {summary.monthChangePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">1 Year</div>
                    <div
                      className={cn(
                        "font-medium",
                        summary.yearChange >= 0 ? "text-profit" : "text-loss"
                      )}
                    >
                      {summary.yearChange >= 0 ? "+" : ""}
                      {summary.yearChangePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WatchlistTable onSelectTicker={handleSelectFromWatchlist} />
        </div>
      </div>
    </div>
  );
}
