"use client";

import { useState, useEffect } from "react";
import { useRollTrade } from "../../hooks/journal-hooks";
import type { TradePosition } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks } from "date-fns";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface RollPositionDialogProps {
  position: TradePosition | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function RollPositionDialog({
  position,
  onOpenChange,
  onSuccess,
}: RollPositionDialogProps) {
  const rollTrade = useRollTrade();

  const [formData, setFormData] = useState<{
    rollDate: string;
    buybackPrice: string;
    newStrike: string;
    newExpirationDate: string;
    newPremium: string;
    commissionClose: string;
    commissionOpen: string;
  }>({
    rollDate: format(new Date(), "yyyy-MM-dd"),
    buybackPrice: "",
    newStrike: "",
    newExpirationDate: "",
    newPremium: "",
    commissionClose: "",
    commissionOpen: "",
  });

  // Pre-fill with current position values when position changes
  useEffect(() => {
    if (position) {
      const currentExp = position.expirationDate
        ? new Date(position.expirationDate)
        : new Date();
      // Default to rolling out 1 week
      const newExp = addWeeks(currentExp, 1);

      setFormData({
        rollDate: format(new Date(), "yyyy-MM-dd"),
        buybackPrice: "",
        newStrike: position.strikePrice?.toString() ?? "",
        newExpirationDate: format(newExp, "yyyy-MM-dd"),
        newPremium: "",
        commissionClose: "",
        commissionOpen: "",
      });
    }
  }, [position]);

  const open = position !== null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position) return;

    try {
      await rollTrade.mutateAsync({
        tradeId: position.id,
        rollDate: formData.rollDate,
        buybackPrice: parseFloat(formData.buybackPrice),
        newStrike: parseFloat(formData.newStrike),
        newExpirationDate: formData.newExpirationDate,
        newPremium: parseFloat(formData.newPremium),
        commissionClose: formData.commissionClose
          ? parseFloat(formData.commissionClose)
          : undefined,
        commissionOpen: formData.commissionOpen
          ? parseFloat(formData.commissionOpen)
          : undefined,
      });
      handleClose();
      onSuccess?.();
    } catch {
      // Error is handled by React Query
    }
  };

  if (!position) return null;

  // Calculate net credit/debit
  const originalPremium = position.premiumPerContract ?? 0;
  const buybackPrice = formData.buybackPrice
    ? parseFloat(formData.buybackPrice)
    : 0;
  const newPremium = formData.newPremium ? parseFloat(formData.newPremium) : 0;
  const netCredit = newPremium - buybackPrice;
  const totalCredit = originalPremium + netCredit;
  const commissions =
    (formData.commissionClose ? parseFloat(formData.commissionClose) : 0) +
    (formData.commissionOpen ? parseFloat(formData.commissionOpen) : 0);

  // Quick expiration date buttons
  const quickDates = position.expirationDate
    ? [
        {
          label: "+1W",
          date: addWeeks(new Date(position.expirationDate), 1),
        },
        {
          label: "+2W",
          date: addWeeks(new Date(position.expirationDate), 2),
        },
        {
          label: "+4W",
          date: addWeeks(new Date(position.expirationDate), 4),
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Roll Position</DialogTitle>
          <DialogDescription>
            Close the current position and open a new one
          </DialogDescription>
        </DialogHeader>

        {/* Current Position Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{position.ticker}</span>
            <Badge
              variant={
                position.positionType === "SHORT_PUT" ? "shortPut" : "shortCall"
              }
            >
              {position.positionType.replace("_", " ")}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
            <div>Strike: {formatCurrency(position.strikePrice)}</div>
            <div>
              Exp:{" "}
              {position.expirationDate
                ? format(new Date(position.expirationDate), "MMM dd")
                : "-"}
            </div>
            <div>Premium: {formatCurrency(position.premiumPerContract)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Close Current Position */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Close Current Position
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rollDate">Roll Date</Label>
                <Input
                  id="rollDate"
                  type="date"
                  value={formData.rollDate}
                  onChange={(e) =>
                    setFormData({ ...formData, rollDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buybackPrice">Buyback Price</Label>
                <Input
                  id="buybackPrice"
                  type="number"
                  step="0.01"
                  value={formData.buybackPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, buybackPrice: e.target.value })
                  }
                  placeholder="0.50"
                  required
                />
              </div>
            </div>
          </div>

          {/* Arrow separator */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Open New Position */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Open New Position
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newStrike">New Strike</Label>
                <Input
                  id="newStrike"
                  type="number"
                  step="0.5"
                  value={formData.newStrike}
                  onChange={(e) =>
                    setFormData({ ...formData, newStrike: e.target.value })
                  }
                  placeholder="150.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPremium">New Premium</Label>
                <Input
                  id="newPremium"
                  type="number"
                  step="0.01"
                  value={formData.newPremium}
                  onChange={(e) =>
                    setFormData({ ...formData, newPremium: e.target.value })
                  }
                  placeholder="1.50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newExpirationDate">New Expiration Date</Label>
              <div className="flex gap-2">
                <Input
                  id="newExpirationDate"
                  type="date"
                  value={formData.newExpirationDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newExpirationDate: e.target.value,
                    })
                  }
                  required
                  className="flex-1"
                />
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        newExpirationDate: format(qd.date, "yyyy-MM-dd"),
                      })
                    }
                  >
                    {qd.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Commissions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commissionClose">Commission (Close)</Label>
              <Input
                id="commissionClose"
                type="number"
                step="0.01"
                value={formData.commissionClose}
                onChange={(e) =>
                  setFormData({ ...formData, commissionClose: e.target.value })
                }
                placeholder="1.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionOpen">Commission (Open)</Label>
              <Input
                id="commissionOpen"
                type="number"
                step="0.01"
                value={formData.commissionOpen}
                onChange={(e) =>
                  setFormData({ ...formData, commissionOpen: e.target.value })
                }
                placeholder="1.00"
              />
            </div>
          </div>

          {/* Roll Summary */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-medium">Roll Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Original Premium:</div>
              <div className="text-right text-profit">
                {formatCurrency(originalPremium)}
              </div>

              <div className="text-muted-foreground">Buyback Cost:</div>
              <div className="text-right text-loss">
                {buybackPrice > 0 ? `-${formatCurrency(buybackPrice)}` : "-"}
              </div>

              <div className="text-muted-foreground">New Premium:</div>
              <div className="text-right text-profit">
                {newPremium > 0 ? `+${formatCurrency(newPremium)}` : "-"}
              </div>

              <div className="text-muted-foreground">Commissions:</div>
              <div className="text-right text-loss">
                {commissions > 0 ? `-${formatCurrency(commissions)}` : "-"}
              </div>

              <div className="border-t pt-2 font-medium">Net Credit:</div>
              <div
                className={cn(
                  "border-t pt-2 text-right font-medium",
                  netCredit >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {netCredit >= 0 ? (
                  <span className="flex items-center justify-end gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {formatCurrency(netCredit)}
                  </span>
                ) : (
                  <span className="flex items-center justify-end gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {formatCurrency(Math.abs(netCredit))}
                  </span>
                )}
              </div>

              <div className="font-medium">Total Credit (per contract):</div>
              <div
                className={cn(
                  "text-right font-medium",
                  totalCredit >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatCurrency(totalCredit)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={rollTrade.isPending}>
              {rollTrade.isPending ? "Rolling..." : "Roll Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
