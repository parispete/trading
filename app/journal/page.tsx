"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DepotSelector,
  YtdSummaryCards,
  OpenPositionsTable,
  TradeForm,
  ClosePositionDialog,
  RollPositionDialog,
  AssignPositionDialog,
  RollChainDialog,
} from "@/modules/trading/components/journal";
import { useOpenPositions } from "@/modules/trading/hooks/journal-hooks";
import type { TradePosition } from "@/modules/trading/types";
import { Plus } from "lucide-react";

export default function JournalPage() {
  const currentYear = new Date().getFullYear();
  const [selectedDepot, setSelectedDepot] = useState<number | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [positionToClose, setPositionToClose] = useState<TradePosition | null>(
    null
  );
  const [positionToRoll, setPositionToRoll] = useState<TradePosition | null>(
    null
  );
  const [positionToAssign, setPositionToAssign] = useState<TradePosition | null>(
    null
  );
  const [positionForRollChain, setPositionForRollChain] = useState<TradePosition | null>(
    null
  );

  // Use openPositions directly for accurate count
  const { data: openPositions } = useOpenPositions(selectedDepot);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground">
            Track your options trades and manage your wheel strategy
          </p>
        </div>
        <Button onClick={() => setShowTradeForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Trade
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <DepotSelector
            value={selectedDepot}
            onChange={setSelectedDepot}
            includeAll
          />
        </div>
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      {/* YTD Summary Cards */}
      <YtdSummaryCards depotId={selectedDepot} year={selectedYear} />

      {/* Open Positions - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
          <Badge variant="secondary">
            {openPositions?.length ?? 0} positions
          </Badge>
        </CardHeader>
        <CardContent>
          <OpenPositionsTable
            depotId={selectedDepot}
            onClose={(position) => setPositionToClose(position)}
            onRoll={(position) => setPositionToRoll(position)}
            onAssign={(position) => setPositionToAssign(position)}
            onViewRollChain={(position) => setPositionForRollChain(position)}
          />
        </CardContent>
      </Card>

      {/* Trade Form Dialog */}
      <TradeForm
        open={showTradeForm}
        onOpenChange={setShowTradeForm}
        onSuccess={() => {
          // Refresh is handled by React Query invalidation
        }}
      />

      {/* Close Position Dialog */}
      <ClosePositionDialog
        position={positionToClose}
        onOpenChange={(open) => {
          if (!open) setPositionToClose(null);
        }}
        onSuccess={() => {
          // Refresh is handled by React Query invalidation
        }}
      />

      {/* Roll Position Dialog */}
      <RollPositionDialog
        position={positionToRoll}
        onOpenChange={(open) => {
          if (!open) setPositionToRoll(null);
        }}
        onSuccess={() => {
          // Refresh is handled by React Query invalidation
        }}
      />

      {/* Assign Position Dialog */}
      <AssignPositionDialog
        position={positionToAssign}
        onOpenChange={(open) => {
          if (!open) setPositionToAssign(null);
        }}
        onSuccess={() => {
          // Refresh is handled by React Query invalidation
        }}
      />

      {/* Roll Chain Dialog */}
      <RollChainDialog
        position={positionForRollChain}
        onOpenChange={(open) => {
          if (!open) setPositionForRollChain(null);
        }}
      />
    </div>
  );
}
