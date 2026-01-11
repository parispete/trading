/**
 * Depot API Routes
 * GET /api/journal/depots - List all depots
 * POST /api/journal/depots - Create a new depot
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllDepots,
  createDepot,
} from "@/modules/trading/lib/journal-repository";
import type { DepotInput } from "@/modules/trading/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("includeArchived") === "true";

    const depots = await getAllDepots(includeArchived);

    return NextResponse.json({
      success: true,
      data: depots,
    });
  } catch (error) {
    console.error("Failed to fetch depots:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch depots",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: DepotInput = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required",
        },
        { status: 400 }
      );
    }

    const depotId = await createDepot(body);

    return NextResponse.json({
      success: true,
      data: { id: depotId },
    });
  } catch (error) {
    console.error("Failed to create depot:", error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json(
        {
          success: false,
          error: "A depot with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create depot",
      },
      { status: 500 }
    );
  }
}
