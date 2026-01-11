"use client";

import { useState } from "react";
import { useCreateTrade, useDepots } from "../../hooks/journal-hooks";
import type { TradePositionInput, PositionType } from "../../types";
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
import { format } from "date-fns";

interface TradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPositionType?: PositionType;
  onSuccess?: () => void;
}

const positionTypeOptions = [
  { value: "SHORT_PUT", label: "Short Put" },
  { value: "SHORT_CALL", label: "Short Call" },
  { value: "LONG_STOCK", label: "Long Stock" },
];

export function TradeForm({
  open,
  onOpenChange,
  defaultPositionType = "SHORT_PUT",
  onSuccess,
}: TradeFormProps) {
  const { data: depots } = useDepots();
  const createTrade = useCreateTrade();

  const [formData, setFormData] = useState<{
    depotId: string;
    ticker: string;
    positionType: PositionType;
    quantity: string;
    strikePrice: string;
    expirationDate: string;
    premiumPerContract: string;
    openDate: string;
    commissionOpen: string;
    notes: string;
  }>({
    depotId: "",
    ticker: "",
    positionType: defaultPositionType,
    quantity: "1",
    strikePrice: "",
    expirationDate: "",
    premiumPerContract: "",
    openDate: format(new Date(), "yyyy-MM-dd"),
    commissionOpen: "",
    notes: "",
  });

  const isOption = formData.positionType !== "LONG_STOCK";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: TradePositionInput = {
      depotId: parseInt(formData.depotId, 10),
      ticker: formData.ticker.toUpperCase(),
      positionType: formData.positionType,
      quantity: parseInt(formData.quantity, 10),
      openDate: formData.openDate,
      strikePrice: isOption && formData.strikePrice
        ? parseFloat(formData.strikePrice)
        : undefined,
      expirationDate: isOption ? formData.expirationDate : undefined,
      premiumPerContract: formData.premiumPerContract
        ? parseFloat(formData.premiumPerContract)
        : undefined,
      commissionOpen: formData.commissionOpen
        ? parseFloat(formData.commissionOpen)
        : undefined,
      notes: formData.notes || undefined,
    };

    try {
      await createTrade.mutateAsync(input);
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setFormData({
        depotId: formData.depotId,
        ticker: "",
        positionType: defaultPositionType,
        quantity: "1",
        strikePrice: "",
        expirationDate: "",
        premiumPerContract: "",
        openDate: format(new Date(), "yyyy-MM-dd"),
        commissionOpen: "",
        notes: "",
      });
    } catch {
      // Error is handled by React Query
    }
  };

  const depotOptions = depots?.map((d) => ({
    value: d.id.toString(),
    label: `${d.name}${d.brokerName ? ` (${d.brokerName})` : ""}`,
  })) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Trade</DialogTitle>
          <DialogDescription>
            Enter the details for your new position
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depot">Depot</Label>
              <Select
                options={depotOptions}
                value={formData.depotId}
                onChange={(val) => setFormData({ ...formData, depotId: val })}
                placeholder="Select depot"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionType">Position Type</Label>
              <Select
                options={positionTypeOptions}
                value={formData.positionType}
                onChange={(val) =>
                  setFormData({ ...formData, positionType: val as PositionType })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={formData.ticker}
                onChange={(e) =>
                  setFormData({ ...formData, ticker: e.target.value.toUpperCase() })
                }
                placeholder="AAPL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </div>
          </div>

          {isOption && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="strikePrice">Strike Price</Label>
                <Input
                  id="strikePrice"
                  type="number"
                  step="0.01"
                  value={formData.strikePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, strikePrice: e.target.value })
                  }
                  placeholder="150.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expirationDate">Expiration Date</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expirationDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="premium">
                {isOption ? "Premium per Contract" : "Price per Share"}
              </Label>
              <Input
                id="premium"
                type="number"
                step="0.01"
                value={formData.premiumPerContract}
                onChange={(e) =>
                  setFormData({ ...formData, premiumPerContract: e.target.value })
                }
                placeholder="1.50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission</Label>
              <Input
                id="commission"
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

          <div className="space-y-2">
            <Label htmlFor="openDate">Open Date</Label>
            <Input
              id="openDate"
              type="date"
              value={formData.openDate}
              onChange={(e) =>
                setFormData({ ...formData, openDate: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Optional notes..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTrade.isPending}>
              {createTrade.isPending ? "Creating..." : "Create Trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
