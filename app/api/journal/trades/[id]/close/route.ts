/**
 * Close Trade Position API
 * POST /api/journal/trades/:id/close - Close a trade position
 */

import { NextRequest, NextResponse } from "next/server";
import { closePosition } from "@/modules/trading/lib/journal-repository";
import type { ClosePositionInput } from "@/modules/trading/types";

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
    if (!body.closeType) {
      return NextResponse.json(
        { success: false, error: "closeType is required" },
        { status: 400 }
      );
    }

    if (!body.closeDate) {
      return NextResponse.json(
        { success: false, error: "closeDate is required" },
        { status: 400 }
      );
    }

    // Validate closeType
    const validCloseTypes = ["EXPIRED", "BUYBACK", "ROLLED", "ASSIGNED", "CALLED_AWAY"];
    if (!validCloseTypes.includes(body.closeType)) {
      return NextResponse.json(
        { success: false, error: `closeType must be one of: ${validCloseTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Buyback requires closePrice
    if (body.closeType === "BUYBACK" && body.closePrice === undefined) {
      return NextResponse.json(
        { success: false, error: "closePrice is required for BUYBACK" },
        { status: 400 }
      );
    }

    const input: ClosePositionInput = {
      tradeId,
      closeType: body.closeType,
      closeDate: body.closeDate,
      closePrice: body.closePrice,
      commissionClose: body.commissionClose || 0,
    };

    const closedTrade = await closePosition(input);

    return NextResponse.json({
      success: true,
      data: closedTrade,
    });
  } catch (error) {
    console.error("Failed to close trade:", error);

    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("already closed")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to close trade",
      },
      { status: 500 }
    );
  }
}
