/**
 * User Settings API Routes
 * GET /api/journal/settings - Get all user settings
 * PUT /api/journal/settings - Update user settings
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUserSettings,
  updateUserSettings,
} from "@/modules/trading/lib/journal-repository";
import type { UserSettings } from "@/modules/trading/types";

export async function GET() {
  try {
    const settings = await getUserSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: Partial<UserSettings> = await request.json();

    // Validate language
    if (body.language && !["en", "de"].includes(body.language)) {
      return NextResponse.json(
        { success: false, error: "language must be 'en' or 'de'" },
        { status: 400 }
      );
    }

    // Validate dateFormat
    if (
      body.dateFormat &&
      !["YYYY-MM-DD", "DD.MM.YYYY", "MM/DD/YYYY"].includes(body.dateFormat)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid dateFormat" },
        { status: 400 }
      );
    }

    // Validate numberFormat
    if (body.numberFormat && !["en-US", "de-DE"].includes(body.numberFormat)) {
      return NextResponse.json(
        { success: false, error: "numberFormat must be 'en-US' or 'de-DE'" },
        { status: 400 }
      );
    }

    // Validate theme
    if (body.theme && !["light", "dark", "system"].includes(body.theme)) {
      return NextResponse.json(
        { success: false, error: "theme must be 'light', 'dark', or 'system'" },
        { status: 400 }
      );
    }

    await updateUserSettings(body);

    // Return updated settings
    const settings = await getUserSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 500 }
    );
  }
}
