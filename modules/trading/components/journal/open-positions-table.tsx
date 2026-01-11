"use client";

import { useState } from "react";
import { useOpenPositions } from "../../hooks/journal-hooks";
import type { TradePosition, PositionType } from "../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { X, RefreshCw, ArrowRightLeft } from "lucide-react";

interface OpenPositionsTableProps {
  depotId?: number;
  onClose?: (position: TradePosition) => void;
  onRoll?: (position: TradePosition) => void;
  onAssign?: (position: TradePosition) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function getPositionTypeBadgeVariant(
  type: PositionType
): "shortPut" | "shortCall" | "longStock" {
  switch (type) {
    case "SHORT_PUT":
      return "shortPut";
    case "SHORT_CALL":
      return "shortCall";
    case "LONG_STOCK":
      return "longStock";
  }
}

function getPositionTypeLabel(type: PositionType): string {
  switch (type) {
    case "SHORT_PUT":
      return "Short Put";
    case "SHORT_CALL":
      return "Short Call";
    case "LONG_STOCK":
      return "Long Stock";
  }
}

function getDaysToExpiration(expirationDate: Date | string | null): number | null {
  if (!expirationDate) return null;
  const exp = typeof expirationDate === "string" ? new Date(expirationDate) : expirationDate;
  return differenceInDays(exp, new Date());
}

function getDteColor(dte: number | null): string {
  if (dte === null) return "";
  if (dte <= 7) return "text-loss";
  if (dte <= 21) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${value.toFixed(2)}%`;
}

function getRorColor(ror: number | null): string {
  if (ror === null) return "";
  if (ror >= 2) return "text-profit";
  if (ror >= 1) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

export function OpenPositionsTable({
  depotId,
  onClose,
  onRoll,
  onAssign,
}: OpenPositionsTableProps) {
  const { data: positions, isLoading, error } = useOpenPositions(depotId);
  const [sortBy, setSortBy] = useState<"ticker" | "dte" | "type">("dte");

  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Loading positions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        Failed to load positions
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No open positions
      </div>
    );
  }

  const sortedPositions = [...positions].sort((a, b) => {
    switch (sortBy) {
      case "ticker":
        return a.ticker.localeCompare(b.ticker);
      case "type":
        return a.positionType.localeCompare(b.positionType);
      case "dte":
      default:
        const dteA = getDaysToExpiration(a.expirationDate) ?? Infinity;
        const dteB = getDaysToExpiration(b.expirationDate) ?? Infinity;
        return dteA - dteB;
    }
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => setSortBy("ticker")}
          >
            Ticker {sortBy === "ticker" && "▲"}
          </TableHead>
          <TableHead
            className="cursor-pointer hover:text-foreground"
            onClick={() => setSortBy("type")}
          >
            Type {sortBy === "type" && "▲"}
          </TableHead>
          <TableHead className="text-right">Strike</TableHead>
          <TableHead
            className="cursor-pointer text-right hover:text-foreground"
            onClick={() => setSortBy("dte")}
          >
            Expiration {sortBy === "dte" && "▲"}
          </TableHead>
          <TableHead className="text-right">DTE</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Premium</TableHead>
          <TableHead className="text-right" title="Rate of Return = (Premium - Fees) / Strike">RoR%</TableHead>
          <TableHead className="text-right" title="Weekly Rate of Return = RoR / Weeks">WRoR%</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPositions.map((position) => {
          const dte = getDaysToExpiration(position.expirationDate);
          const isOption = position.positionType !== "LONG_STOCK";

          return (
            <TableRow key={position.id}>
              <TableCell className="font-medium">{position.ticker}</TableCell>
              <TableCell>
                <Badge variant={getPositionTypeBadgeVariant(position.positionType)}>
                  {getPositionTypeLabel(position.positionType)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {position.strikePrice ? formatCurrency(position.strikePrice) : "-"}
              </TableCell>
              <TableCell className="text-right">
                {position.expirationDate
                  ? format(new Date(position.expirationDate), "MMM dd, yyyy")
                  : "-"}
              </TableCell>
              <TableCell className={cn("text-right font-medium", getDteColor(dte))}>
                {dte !== null ? `${dte}d` : "-"}
              </TableCell>
              <TableCell className="text-right">{position.quantity}</TableCell>
              <TableCell className="text-right text-profit">
                {position.premiumPerContract
                  ? formatCurrency(position.premiumPerContract * position.quantity * 100)
                  : "-"}
              </TableCell>
              <TableCell className={cn("text-right font-medium", getRorColor(position.ror))}>
                {formatPercent(position.ror)}
                {position.rollCount > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (R{position.rollCount})
                  </span>
                )}
              </TableCell>
              <TableCell className={cn("text-right font-medium", getRorColor(position.wror))}>
                {formatPercent(position.wror)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {onClose && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onClose(position)}
                      title="Close position"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {onRoll && isOption && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRoll(position)}
                      title="Roll position"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {onAssign && position.positionType === "SHORT_PUT" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssign(position)}
                      title="Assignment"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
