/**
 * Depot Detail API Routes
 * GET /api/journal/depots/:id - Get depot by ID
 * PUT /api/journal/depots/:id - Update depot
 * DELETE /api/journal/depots/:id - Delete depot
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDepot,
  updateDepot,
  deleteDepot,
  archiveDepot,
} from "@/modules/trading/lib/journal-repository";
import type { DepotInput } from "@/modules/trading/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const depotId = parseInt(id, 10);

    if (isNaN(depotId)) {
      return NextResponse.json(
        { success: false, error: "Invalid depot ID" },
        { status: 400 }
      );
    }

    const depot = await getDepot(depotId);

    if (!depot) {
      return NextResponse.json(
        { success: false, error: "Depot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: depot,
    });
  } catch (error) {
    console.error("Failed to fetch depot:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch depot",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const depotId = parseInt(id, 10);

    if (isNaN(depotId)) {
      return NextResponse.json(
        { success: false, error: "Invalid depot ID" },
        { status: 400 }
      );
    }

    const body: Partial<DepotInput> = await request.json();

    const updated = await updateDepot(depotId, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const depot = await getDepot(depotId);

    return NextResponse.json({
      success: true,
      data: depot,
    });
  } catch (error) {
    console.error("Failed to update depot:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update depot",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const depotId = parseInt(id, 10);

    if (isNaN(depotId)) {
      return NextResponse.json(
        { success: false, error: "Invalid depot ID" },
        { status: 400 }
      );
    }

    // Check if archive or delete
    const searchParams = request.nextUrl.searchParams;
    const archive = searchParams.get("archive") === "true";

    if (archive) {
      await archiveDepot(depotId);
    } else {
      await deleteDepot(depotId);
    }

    return NextResponse.json({
      success: true,
      data: { deleted: !archive, archived: archive },
    });
  } catch (error) {
    console.error("Failed to delete depot:", error);

    // Check for constraint violation (has trades)
    if (error instanceof Error && error.message.includes("existing trades")) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete depot",
      },
      { status: 500 }
    );
  }
}
