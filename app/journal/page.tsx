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
} from "@/modules/trading/components/journal";
import { useDashboard } from "@/modules/trading/hooks/journal-hooks";
import type { TradePosition } from "@/modules/trading/types";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

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

  const { data: dashboardData, isLoading } = useDashboard(
    selectedDepot,
    selectedYear
  );

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

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Open Positions - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Open Positions</CardTitle>
            {dashboardData && (
              <Badge variant="secondary">
                {dashboardData.openPositions?.totalPositions ?? 0} positions
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <OpenPositionsTable
              depotId={selectedDepot}
              onClose={(position) => setPositionToClose(position)}
              onRoll={(position) => setPositionToRoll(position)}
              onAssign={(position) => setPositionToAssign(position)}
            />
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expiring Soon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : dashboardData?.expiringSoon &&
                dashboardData.expiringSoon.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.expiringSoon.slice(0, 5).map((position) => (
                    <div
                      key={position.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <span className="font-medium">{position.ticker}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          ${position.strikePrice}
                        </span>
                      </div>
                      <Badge
                        variant="warning"
                        className="text-xs"
                      >
                        {position.expirationDate
                          ? format(
                              new Date(position.expirationDate),
                              "MMM dd"
                            )
                          : "N/A"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No positions expiring in the next 7 days
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded bg-muted"
                    />
                  ))}
                </div>
              ) : dashboardData?.recentActivity &&
                dashboardData.recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.recentActivity.slice(0, 5).map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <span className="font-medium">{trade.ticker}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {trade.positionType.replace("_", " ")}
                        </span>
                      </div>
                      <Badge
                        variant={
                          trade.status === "OPEN" ? "secondary" : "outline"
                        }
                      >
                        {trade.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}
