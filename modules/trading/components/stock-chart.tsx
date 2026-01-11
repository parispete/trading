"use client";

/**
 * Stock Chart Component
 * Displays historical price data using Recharts
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePriceHistory } from "../hooks";
import type { ChartConfig } from "../types";

interface StockChartProps {
  ticker: string;
  config?: Partial<ChartConfig>;
  className?: string;
}

export function StockChart({
  ticker,
  config = {},
  className,
}: StockChartProps) {
  const {
    period = "1Y",
    chartType = "area",
    showVolume = false,
  } = config;

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "1D":
        startDate.setDate(endDate.getDate() - 1);
        break;
      case "1W":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "3M":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "6M":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "1Y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "5Y":
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      case "MAX":
        startDate.setFullYear(1990);
        break;
    }

    return { startDate, endDate };
  }, [period]);

  const { data: priceData, isLoading, error } = usePriceHistory({
    ticker,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    adjusted: true,
  });

  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!priceData) return [];

    return priceData.map((price) => ({
      date: format(price.date, "MMM dd, yyyy"),
      dateRaw: price.date,
      close: price.close,
      open: price.open,
      high: price.high,
      low: price.low,
      volume: price.volume,
    }));
  }, [priceData]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (!chartData || chartData.length < 2) return null;

    const firstPrice = chartData[0].close;
    const lastPrice = chartData[chartData.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;

    return {
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading chart...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-destructive">
            Error loading chart: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const strokeColor = priceChange?.isPositive
    ? "var(--color-profit)"
    : "var(--color-loss)";
  const fillColor = priceChange?.isPositive
    ? "rgba(34, 197, 94, 0.1)"
    : "rgba(239, 68, 68, 0.1)";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{ticker}</CardTitle>
          {priceChange && (
            <div
              className={`text-sm font-medium ${
                priceChange.isPositive ? "text-profit" : "text-loss"
              }`}
            >
              {priceChange.isPositive ? "+" : ""}
              {priceChange.change.toFixed(2)} (
              {priceChange.changePercent.toFixed(2)}%)
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return format(date, "MMM dd");
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <div className="text-sm font-medium">{data.date}</div>
                          <div className="mt-1 grid gap-1 text-sm">
                            <div>Open: ${data.open.toFixed(2)}</div>
                            <div>High: ${data.high.toFixed(2)}</div>
                            <div>Low: ${data.low.toFixed(2)}</div>
                            <div className="font-medium">
                              Close: ${data.close.toFixed(2)}
                            </div>
                            {showVolume && (
                              <div>Volume: {data.volume.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
