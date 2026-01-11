/**
 * Screening Profile API Routes
 * GET /api/journal/screening - List all screening profiles
 * POST /api/journal/screening - Create a new screening profile
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getScreeningProfiles,
  createScreeningProfile,
  addScreeningCriterion,
} from "@/modules/trading/lib/journal-repository";
import type { ScreeningCriterionInput } from "@/modules/trading/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeSystem = searchParams.get("includeSystem") !== "false";

    const profiles = await getScreeningProfiles(includeSystem);

    return NextResponse.json({
      success: true,
      data: profiles,
    });
  } catch (error) {
    console.error("Failed to fetch screening profiles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch screening profiles",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    // Validate timeframe
    if (body.timeframe && !["D", "W"].includes(body.timeframe)) {
      return NextResponse.json(
        { success: false, error: "timeframe must be 'D' or 'W'" },
        { status: 400 }
      );
    }

    const profileId = await createScreeningProfile(
      body.name,
      body.description,
      body.timeframe || "D"
    );

    // Add criteria if provided
    if (body.criteria && Array.isArray(body.criteria)) {
      for (const criterion of body.criteria as ScreeningCriterionInput[]) {
        await addScreeningCriterion(profileId, criterion);
      }
    }

    // Fetch the created profile with criteria
    const profiles = await getScreeningProfiles(true);
    const createdProfile = profiles.find((p) => p.id === profileId);

    return NextResponse.json({
      success: true,
      data: createdProfile,
    });
  } catch (error) {
    console.error("Failed to create screening profile:", error);

    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json(
        { success: false, error: "A profile with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create screening profile",
      },
      { status: 500 }
    );
  }
}
