/**
 * Assign Trade Position API
 * POST /api/journal/trades/:id/assign - Process assignment of a put position
 */

import { NextRequest, NextResponse } from "next/server";
import { assignPosition } from "@/modules/trading/lib/journal-repository";

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
    if (!body.assignmentDate) {
      return NextResponse.json(
        { success: false, error: "assignmentDate is required" },
        { status: 400 }
      );
    }

    const stockId = await assignPosition(
      tradeId,
      body.assignmentDate,
      body.assignmentCommission || 0
    );

    return NextResponse.json({
      success: true,
      data: {
        closedPutId: tradeId,
        newStockId: stockId,
      },
    });
  } catch (error) {
    console.error("Failed to process assignment:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("SHORT_PUT")) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process assignment",
      },
      { status: 500 }
    );
  }
}
