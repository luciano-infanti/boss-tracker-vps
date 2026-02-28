import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const { searchParams } = request.nextUrl;
  const worldId = parseInt(searchParams.get("worldId") || "1", 10);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const bossName = decodeURIComponent(name);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  try {
    const history = await prisma.killRecord.findMany({
      where: {
        worldId,
        creatureName: bossName,
        effectiveDate: { gte: cutoffStr },
      },
      orderBy: { effectiveDate: "asc" },
      select: {
        effectiveDate: true,
        kills24h: true,
      },
    });

    return NextResponse.json({
      boss: bossName,
      worldId,
      history,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Database connection failed", detail: msg },
      { status: 503 }
    );
  }
}
