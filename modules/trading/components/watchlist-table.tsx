"use client";

/**
 * Watchlist Table Component
 * Displays watchlist items with prices and changes
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWatchlist } from "../hooks";
import { cn } from "@/lib/utils";

interface WatchlistTableProps {
  listName?: string;
  onSelectTicker?: (ticker: string) => void;
  className?: string;
}

export function WatchlistTable({
  listName = "default",
  onSelectTicker,
  className,
}: WatchlistTableProps) {
  const { data: watchlist, isLoading, error } = useWatchlist(listName);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading watchlist...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            Error loading watchlist: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!watchlist || watchlist.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            No items in watchlist. Add some stocks to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">Symbol</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 text-right font-medium">Price</th>
                <th className="pb-3 text-right font-medium">Change</th>
                <th className="pb-3 text-right font-medium">% Change</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => {
                const isPositive =
                  item.dayChange !== undefined && item.dayChange >= 0;

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b last:border-0",
                      onSelectTicker &&
                        "cursor-pointer hover:bg-muted/50 transition-colors"
                    )}
                    onClick={() => onSelectTicker?.(item.ticker)}
                  >
                    <td className="py-3 font-medium">{item.ticker}</td>
                    <td className="py-3 text-muted-foreground">
                      {item.name || "-"}
                    </td>
                    <td className="py-3 text-right">
                      {item.lastPrice !== undefined
                        ? `$${item.lastPrice.toFixed(2)}`
                        : "-"}
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right",
                        isPositive ? "text-profit" : "text-loss"
                      )}
                    >
                      {item.dayChange !== undefined
                        ? `${isPositive ? "+" : ""}${item.dayChange.toFixed(2)}`
                        : "-"}
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right",
                        isPositive ? "text-profit" : "text-loss"
                      )}
                    >
                      {item.dayChangePercent !== undefined
                        ? `${isPositive ? "+" : ""}${item.dayChangePercent.toFixed(2)}%`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
