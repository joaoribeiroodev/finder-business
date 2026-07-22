import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const job = await prisma.scrapeJob.findUnique({ where: { id: params.id } });
    if (!job) {
      return NextResponse.json({ success: false, error: "Busca não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error(`[GET /api/scraper/${params.id}]`, error);
    return NextResponse.json({ success: false, error: "Erro ao buscar status." }, { status: 500 });
  }
}
