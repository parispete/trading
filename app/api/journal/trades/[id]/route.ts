/**
 * Trade Position Detail API Routes
 * GET /api/journal/trades/:id - Get trade by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getTradePosition } from "@/modules/trading/lib/journal-repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id, 10);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid trade ID" },
        { status: 400 }
      );
    }

    const trade = await getTradePosition(tradeId);

    if (!trade) {
      return NextResponse.json(
        { success: false, error: "Trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trade,
    });
  } catch (error) {
    console.error("Failed to fetch trade:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch trade",
      },
      { status: 500 }
    );
  }
}
