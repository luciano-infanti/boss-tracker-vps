import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveKillDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const worldId = parseInt(searchParams.get("worldId") || "1", 10);
  const date = searchParams.get("date") || getEffectiveKillDate();

  try {
    const records = await prisma.killRecord.findMany({
      where: { worldId, effectiveDate: date },
      orderBy: { creatureName: "asc" },
    });

    return NextResponse.json({
      data: records,
      effectiveDate: date,
      worldId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Database connection failed", detail: msg },
      { status: 503 }
    );
  }
}
