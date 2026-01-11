/**
 * Roll Chain API
 * GET /api/journal/trades/:id/roll-chain - Get full roll chain for a position
 */

import { NextRequest, NextResponse } from "next/server";
import { getRollChainDetails } from "@/modules/trading/lib/journal-repository";

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

    const rollChain = await getRollChainDetails(tradeId);

    return NextResponse.json({
      success: true,
      data: rollChain,
    });
  } catch (error) {
    console.error("Failed to fetch roll chain:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch roll chain",
      },
      { status: 500 }
    );
  }
}
