import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        mensagens: { orderBy: { createdAt: "desc" }, take: 10 },
        scrapeJob: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    console.error(`[GET /api/leads/${params.id}]`, error);
    return NextResponse.json({ success: false, error: "Erro ao buscar lead." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    await prisma.lead.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/leads/${params.id}]`, error);
    return NextResponse.json({ success: false, error: "Erro ao excluir lead." }, { status: 500 });
  }
}
