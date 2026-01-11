"use client";

import { useState } from "react";
import { useCloseTrade } from "../../hooks/journal-hooks";
import type { TradePosition, CloseType } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

interface ClosePositionDialogProps {
  position: TradePosition | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function getCloseTypeOptions(positionType: string): { value: CloseType; label: string }[] {
  switch (positionType) {
    case "SHORT_PUT":
      return [
        { value: "EXPIRED", label: "Expired Worthless" },
        { value: "BUYBACK", label: "Buy to Close" },
        { value: "ASSIGNED", label: "Assigned" },
        { value: "ROLLED", label: "Rolled" },
      ];
    case "SHORT_CALL":
      return [
        { value: "EXPIRED", label: "Expired Worthless" },
        { value: "BUYBACK", label: "Buy to Close" },
        { value: "CALLED_AWAY", label: "Called Away" },
        { value: "ROLLED", label: "Rolled" },
      ];
    case "LONG_STOCK":
      return [
        { value: "BUYBACK", label: "Sold" },
        { value: "CALLED_AWAY", label: "Called Away" },
      ];
    default:
      return [
        { value: "EXPIRED", label: "Expired" },
        { value: "BUYBACK", label: "Closed" },
      ];
  }
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function ClosePositionDialog({
  position,
  onOpenChange,
  onSuccess,
}: ClosePositionDialogProps) {
  const closeTrade = useCloseTrade();

  const [formData, setFormData] = useState<{
    closeType: CloseType;
    closeDate: string;
    closePrice: string;
    commissionClose: string;
  }>({
    closeType: "EXPIRED",
    closeDate: format(new Date(), "yyyy-MM-dd"),
    closePrice: "",
    commissionClose: "",
  });

  const open = position !== null;

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!position) return;

    try {
      await closeTrade.mutateAsync({
        tradeId: position.id,
        closeType: formData.closeType,
        closeDate: formData.closeDate,
        closePrice: formData.closePrice ? parseFloat(formData.closePrice) : 0,
        commissionClose: formData.commissionClose
          ? parseFloat(formData.commissionClose)
          : undefined,
      });
      handleClose();
      onSuccess?.();
      // Reset form
      setFormData({
        closeType: "EXPIRED",
        closeDate: format(new Date(), "yyyy-MM-dd"),
        closePrice: "",
        commissionClose: "",
      });
    } catch {
      // Error is handled by React Query
    }
  };

  if (!position) return null;

  const closeTypeOptions = getCloseTypeOptions(position.positionType);
  const isOption = position.positionType !== "LONG_STOCK";
  const showClosePrice = formData.closeType !== "EXPIRED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Position</DialogTitle>
          <DialogDescription>
            Close your {position.ticker} position
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{position.ticker}</span>
            <Badge variant={
              position.positionType === "SHORT_PUT" ? "shortPut" :
              position.positionType === "SHORT_CALL" ? "shortCall" : "longStock"
            }>
              {position.positionType.replace("_", " ")}
            </Badge>
          </div>
          {isOption && (
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Strike: {formatCurrency(position.strikePrice)}</div>
              <div>
                Exp: {position.expirationDate
                  ? format(new Date(position.expirationDate), "MMM dd, yyyy")
                  : "-"}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Qty: {position.quantity}</div>
            <div>
              Premium: {position.premiumPerContract
                ? formatCurrency(position.premiumPerContract * position.quantity * 100)
                : "-"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closeType">Close Type</Label>
              <Select
                options={closeTypeOptions}
                value={formData.closeType}
                onChange={(val) =>
                  setFormData({ ...formData, closeType: val as CloseType })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeDate">Close Date</Label>
              <Input
                id="closeDate"
                type="date"
                value={formData.closeDate}
                onChange={(e) =>
                  setFormData({ ...formData, closeDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          {showClosePrice && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="closePrice">
                  {formData.closeType === "BUYBACK" && isOption
                    ? "Buyback Price per Contract"
                    : "Close Price"}
                </Label>
                <Input
                  id="closePrice"
                  type="number"
                  step="0.01"
                  value={formData.closePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, closePrice: e.target.value })
                  }
                  placeholder="0.50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionClose">Commission</Label>
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
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={formData.closeType === "EXPIRED" ? "profit" : "default"}
              disabled={closeTrade.isPending}
            >
              {closeTrade.isPending ? "Closing..." : "Close Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
