"use client";

import { useRollChain } from "../../hooks/journal-hooks";
import type { TradePosition } from "../../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface RollChainDialogProps {
  position: TradePosition | null;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return format(new Date(date), "MMM dd, yyyy");
}

export function RollChainDialog({ position, onOpenChange }: RollChainDialogProps) {
  const { data: rollChain, isLoading } = useRollChain(position?.id ?? null);

  const open = position !== null;

  if (!position) return null;

  // Calculate totals
  const totals = rollChain?.reduce(
    (acc, pos) => {
      const premium = (pos.premiumPerContract ?? 0) * pos.quantity * 100;
      const fees = (pos.commissionOpen ?? 0) + (pos.commissionClose ?? 0);
      return {
        totalPremium: acc.totalPremium + premium,
        totalFees: acc.totalFees + fees,
      };
    },
    { totalPremium: 0, totalFees: 0 }
  ) ?? { totalPremium: 0, totalFees: 0 };

  const netPremium = totals.totalPremium - totals.totalFees;
  const currentStrike = position.strikePrice ?? 0;
  const capitalAtRisk = currentStrike * 100 * position.quantity;
  const totalRor = capitalAtRisk > 0 ? (netPremium / capitalAtRisk) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Roll History: {position.ticker}
          </DialogTitle>
          <DialogDescription>
            {position.rollCount} roll{position.rollCount !== 1 ? "s" : ""} for this position
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading roll chain...</span>
          </div>
        ) : rollChain && rollChain.length > 0 ? (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Open Date</TableHead>
                    <TableHead>Close Date</TableHead>
                    <TableHead className="text-right">Strike</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollChain.map((pos, index) => {
                    const premium = (pos.premiumPerContract ?? 0) * pos.quantity * 100;
                    const fees = (pos.commissionOpen ?? 0) + (pos.commissionClose ?? 0);
                    const isOriginal = index === 0;
                    const isCurrent = index === rollChain.length - 1;

                    return (
                      <TableRow key={pos.id} className={isCurrent ? "bg-muted/50" : ""}>
                        <TableCell className="font-mono text-muted-foreground">
                          {isOriginal ? "Orig" : `R${index}`}
                        </TableCell>
                        <TableCell>{formatDate(pos.openDate)}</TableCell>
                        <TableCell>
                          {pos.closeDate ? formatDate(pos.closeDate) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pos.strikePrice)}
                        </TableCell>
                        <TableCell>
                          {pos.expirationDate ? formatDate(pos.expirationDate) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-profit">
                          {formatCurrency(premium)}
                        </TableCell>
                        <TableCell className="text-right text-loss">
                          {formatCurrency(fees)}
                        </TableCell>
                        <TableCell>
                          {isCurrent ? (
                            <Badge variant="secondary">Current</Badge>
                          ) : (
                            <Badge variant="outline">Rolled</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-4 grid grid-cols-4 gap-4 rounded-lg bg-muted p-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Premium</div>
                <div className="text-lg font-semibold text-profit">
                  {formatCurrency(totals.totalPremium)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Fees</div>
                <div className="text-lg font-semibold text-loss">
                  {formatCurrency(totals.totalFees)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Net Premium</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(netPremium)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total RoR%</div>
                <div className="text-lg font-semibold text-profit">
                  {totalRor.toFixed(2)}%
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No roll history found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
