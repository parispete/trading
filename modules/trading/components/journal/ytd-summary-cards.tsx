"use client";

import { useDashboard } from "../../hooks/journal-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Percent,
  Receipt,
} from "lucide-react";

interface YtdSummaryCardsProps {
  depotId?: number;
  year?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function YtdSummaryCards({ depotId, year }: YtdSummaryCardsProps) {
  const { data, isLoading, error } = useDashboard(depotId, year);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        Failed to load summary data
      </div>
    );
  }

  const { ytdSummary } = data;

  const cards = [
    {
      title: "Net P&L",
      value: formatCurrency(ytdSummary.netProfitLoss),
      icon: ytdSummary.netProfitLoss >= 0 ? TrendingUp : TrendingDown,
      isProfit: ytdSummary.netProfitLoss >= 0,
      description: `${ytdSummary.tradesClosed} trades closed`,
    },
    {
      title: "Premium Collected",
      value: formatCurrency(ytdSummary.totalPremium),
      icon: DollarSign,
      isProfit: true,
      description: `${ytdSummary.tradesOpened} trades opened`,
    },
    {
      title: "Dividends",
      value: formatCurrency(ytdSummary.totalDividends),
      icon: Receipt,
      isProfit: true,
      description: "Year to date",
    },
    {
      title: "Win Rate",
      value: formatPercent(ytdSummary.winRate),
      icon: Percent,
      isProfit: ytdSummary.winRate >= 50,
      description: `Commissions: ${formatCurrency(ytdSummary.totalCommissions)}`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon
                className={cn(
                  "h-4 w-4",
                  card.isProfit ? "text-profit" : "text-loss"
                )}
              />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  card.title === "Net P&L" && (card.isProfit ? "text-profit" : "text-loss")
                )}
              >
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
