/**
 * Dividend API Routes
 * GET /api/journal/dividends - List dividends
 * POST /api/journal/dividends - Record a new dividend
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDividends,
  createDividend,
} from "@/modules/trading/lib/journal-repository";
import type { DividendInput } from "@/modules/trading/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const depotId = searchParams.get("depotId");
    const securityId = searchParams.get("securityId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dividends = await getDividends({
      depotId: depotId ? parseInt(depotId, 10) : undefined,
      securityId: securityId ? parseInt(securityId, 10) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json({
      success: true,
      data: dividends,
    });
  } catch (error) {
    console.error("Failed to fetch dividends:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch dividends",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DividendInput = await request.json();

    // Validate required fields
    if (!body.depotId) {
      return NextResponse.json(
        { success: false, error: "depotId is required" },
        { status: 400 }
      );
    }

    if (!body.securityId) {
      return NextResponse.json(
        { success: false, error: "securityId is required" },
        { status: 400 }
      );
    }

    if (!body.exDividendDate) {
      return NextResponse.json(
        { success: false, error: "exDividendDate is required" },
        { status: 400 }
      );
    }

    if (!body.sharesHeld || body.sharesHeld <= 0) {
      return NextResponse.json(
        { success: false, error: "sharesHeld must be greater than 0" },
        { status: 400 }
      );
    }

    if (!body.dividendPerShare || body.dividendPerShare <= 0) {
      return NextResponse.json(
        { success: false, error: "dividendPerShare must be greater than 0" },
        { status: 400 }
      );
    }

    const dividendId = await createDividend(body);

    return NextResponse.json({
      success: true,
      data: { id: dividendId },
    });
  } catch (error) {
    console.error("Failed to create dividend:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create dividend",
      },
      { status: 500 }
    );
  }
}
