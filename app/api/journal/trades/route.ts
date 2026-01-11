/**
 * Trade Position API Routes
 * GET /api/journal/trades - List trades (open positions or history)
 * POST /api/journal/trades - Create a new trade position
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOpenPositions,
  getTradeHistory,
  createTradePosition,
  findOrCreateSecurity,
} from "@/modules/trading/lib/journal-repository";
import type { TradePositionInput } from "@/modules/trading/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "open";
    const depotId = searchParams.get("depotId");
    const securityId = searchParams.get("securityId");
    const positionType = searchParams.get("positionType");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");

    let trades;

    if (status === "open") {
      trades = await getOpenPositions({
        depotId: depotId ? parseInt(depotId, 10) : undefined,
        positionType: positionType || undefined,
        securityId: securityId ? parseInt(securityId, 10) : undefined,
      });
    } else {
      trades = await getTradeHistory({
        depotId: depotId ? parseInt(depotId, 10) : undefined,
        securityId: securityId ? parseInt(securityId, 10) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      data: trades,
    });
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch trades",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TradePositionInput & { ticker?: string } = await request.json();

    // Validate required fields
    if (!body.depotId) {
      return NextResponse.json(
        { success: false, error: "depotId is required" },
        { status: 400 }
      );
    }

    // Handle ticker -> securityId conversion
    let securityId = body.securityId;
    if (!securityId && body.ticker) {
      securityId = await findOrCreateSecurity(body.ticker);
    }

    if (!securityId) {
      return NextResponse.json(
        { success: false, error: "Either securityId or ticker is required" },
        { status: 400 }
      );
    }

    if (!body.positionType) {
      return NextResponse.json(
        { success: false, error: "positionType is required" },
        { status: 400 }
      );
    }

    if (body.quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "quantity is required" },
        { status: 400 }
      );
    }

    if (!body.openDate) {
      return NextResponse.json(
        { success: false, error: "openDate is required" },
        { status: 400 }
      );
    }

    // Validate options-specific fields
    if (body.positionType === "SHORT_PUT" || body.positionType === "SHORT_CALL") {
      if (!body.strikePrice) {
        return NextResponse.json(
          { success: false, error: "strikePrice is required for options" },
          { status: 400 }
        );
      }

      if (!body.expirationDate) {
        return NextResponse.json(
          { success: false, error: "expirationDate is required for options" },
          { status: 400 }
        );
      }
    }

    // Create the trade with resolved securityId
    const tradeInput: TradePositionInput = {
      ...body,
      securityId,
    };

    const tradeId = await createTradePosition(tradeInput);

    return NextResponse.json({
      success: true,
      data: { id: tradeId },
    });
  } catch (error) {
    console.error("Failed to create trade:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create trade",
      },
      { status: 500 }
    );
  }
}
