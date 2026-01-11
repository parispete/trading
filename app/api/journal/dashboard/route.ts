/**
 * Dashboard API Route
 * GET /api/journal/dashboard - Get dashboard summary data
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardSummary,
  getOpenPositions,
  getTradeHistory,
} from "@/modules/trading/lib/journal-repository";

// Helper to convert BigInt to Number for JSON serialization
function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const depotId = searchParams.get("depotId");
    const year = searchParams.get("year");

    // Get dashboard summary
    const summary = await getDashboardSummary({
      depotId: depotId ? parseInt(depotId, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });

    // Get open positions
    const openPositions = await getOpenPositions({
      depotId: depotId ? parseInt(depotId, 10) : undefined,
    });

    // Get recent activity (last 10 trades)
    const recentActivity = await getTradeHistory({
      depotId: depotId ? parseInt(depotId, 10) : undefined,
      limit: 10,
    });

    // Get positions expiring soon (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = openPositions.filter((p) => {
      if (!p.expirationDate) return false;
      const exp = new Date(p.expirationDate);
      return exp <= weekFromNow;
    });

    const responseData = {
      ...summary,
      openPositions,
      recentActivity,
      expiringSoon,
      positionsByType: {
        shortPuts: openPositions.filter((p) => p.positionType === "SHORT_PUT"),
        shortCalls: openPositions.filter((p) => p.positionType === "SHORT_CALL"),
        longStocks: openPositions.filter((p) => p.positionType === "LONG_STOCK"),
      },
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(responseData),
    });
  } catch (error) {
    console.error("Failed to fetch dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch dashboard",
      },
      { status: 500 }
    );
  }
}
