/**
 * Roll Trade Position API
 * POST /api/journal/trades/:id/roll - Roll a position to new strike/expiration
 */

import { NextRequest, NextResponse } from "next/server";
import { rollPosition } from "@/modules/trading/lib/journal-repository";
import type { RollInput } from "@/modules/trading/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tradeId = parseInt(id, 10);

    if (isNaN(tradeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid trade ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "buybackPrice",
      "newStrike",
      "newExpirationDate",
      "newPremium",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const input: RollInput = {
      tradeId,
      buybackPrice: body.buybackPrice,
      buybackCommission: body.buybackCommission || 0,
      newStrike: body.newStrike,
      newExpirationDate: body.newExpirationDate,
      newPremium: body.newPremium,
      newCommission: body.newCommission || 0,
    };

    const result = await rollPosition(input);

    return NextResponse.json({
      success: true,
      data: {
        closedTradeId: result.closedTradeId,
        newTradeId: result.newTradeId,
      },
    });
  } catch (error) {
    console.error("Failed to roll trade:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to roll trade",
      },
      { status: 500 }
    );
  }
}
