"use client";

import { useState, useEffect } from "react";
import { useAssignTrade } from "../../hooks/journal-hooks";
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
import { format } from "date-fns";
import { ArrowDown, Package } from "lucide-react";

interface AssignPositionDialogProps {
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

export function AssignPositionDialog({
  position,
  onOpenChange,
  onSuccess,
}: AssignPositionDialogProps) {
  const assignTrade = useAssignTrade();

  const [formData, setFormData] = useState<{
    assignmentDate: string;
    assignmentCommission: string;
  }>({
    assignmentDate: format(new Date(), "yyyy-MM-dd"),
    assignmentCommission: "",
  });

  // Reset form when position changes
  useEffect(() => {
    if (position) {
      // Default assignment date to expiration date if available
      const defaultDate = position.expirationDate
        ? format(new Date(position.expirationDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

      setFormData({
        assignmentDate: defaultDate,
        assignmentCommission: "",
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
      await assignTrade.mutateAsync({
        tradeId: position.id,
        assignmentDate: formData.assignmentDate,
        assignmentCommission: formData.assignmentCommission
          ? parseFloat(formData.assignmentCommission)
          : undefined,
      });
      handleClose();
      onSuccess?.();
    } catch {
      // Error is handled by React Query
    }
  };

  if (!position) return null;

  // Calculate the stock position details
  const strikePrice = position.strikePrice ?? 0;
  const quantity = position.quantity;
  const sharesPerContract = 100;
  const totalShares = quantity * sharesPerContract;
  const totalCost = strikePrice * totalShares;
  const premiumReceived = (position.premiumPerContract ?? 0) * quantity * sharesPerContract;
  const effectiveCostBasis = strikePrice - (position.premiumPerContract ?? 0);
  const commission = formData.assignmentCommission
    ? parseFloat(formData.assignmentCommission)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assignment</DialogTitle>
          <DialogDescription>
            Your Short Put has been assigned - you will receive shares
          </DialogDescription>
        </DialogHeader>

        {/* Current Position Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{position.ticker}</span>
            <Badge variant="shortPut">Short Put</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
            <div>Strike: {formatCurrency(position.strikePrice)}</div>
            <div>Qty: {position.quantity}</div>
            <div>Premium: {formatCurrency(position.premiumPerContract)}</div>
          </div>
        </div>

        {/* Arrow showing transformation */}
        <div className="flex flex-col items-center gap-2 py-2">
          <ArrowDown className="h-6 w-6 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>Receiving {totalShares} shares</span>
          </div>
        </div>

        {/* New Stock Position Preview */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{position.ticker}</span>
            <Badge variant="longStock">Long Stock</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Shares:</div>
            <div className="text-right font-medium">{totalShares}</div>

            <div className="text-muted-foreground">Purchase Price:</div>
            <div className="text-right">{formatCurrency(strikePrice)}</div>

            <div className="text-muted-foreground">Total Cost:</div>
            <div className="text-right">{formatCurrency(totalCost)}</div>

            <div className="text-muted-foreground">Premium Received:</div>
            <div className="text-right text-profit">
              -{formatCurrency(premiumReceived)}
            </div>

            <div className="border-t pt-2 font-medium">Effective Cost Basis:</div>
            <div className="border-t pt-2 text-right font-medium text-profit">
              {formatCurrency(effectiveCostBasis)} / share
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignmentDate">Assignment Date</Label>
              <Input
                id="assignmentDate"
                type="date"
                value={formData.assignmentDate}
                onChange={(e) =>
                  setFormData({ ...formData, assignmentDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignmentCommission">Commission</Label>
              <Input
                id="assignmentCommission"
                type="number"
                step="0.01"
                value={formData.assignmentCommission}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignmentCommission: e.target.value,
                  })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {commission > 0 && (
            <div className="text-sm text-muted-foreground">
              Adjusted cost basis:{" "}
              <span className="font-medium">
                {formatCurrency(effectiveCostBasis + commission / totalShares)} / share
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={assignTrade.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {assignTrade.isPending ? "Processing..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
