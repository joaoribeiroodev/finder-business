import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
      db: "ok",
    });
  } catch {
    return NextResponse.json(
      { success: false, status: "unhealthy", db: "error" },
      { status: 503 }
    );
  }
}
