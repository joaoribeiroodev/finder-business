import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const now = new Date();
    const seteDias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const trintaDias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      pendentes,
      processando,
      gerados,
      contatados,
      reunioes,
      semInteresse,
      leads7d,
      leads30d,
      topCidades,
      topNichos,
      buscasRecentes,
      altoScore,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: LeadStatus.PENDENTE } }),
      prisma.lead.count({ where: { status: LeadStatus.PROCESSANDO_IA } }),
      prisma.lead.count({ where: { status: LeadStatus.MENSAGEM_GERADA } }),
      prisma.lead.count({ where: { status: LeadStatus.CONTATADO } }),
      prisma.lead.count({ where: { status: LeadStatus.REUNIAO_AGENDADA } }),
      prisma.lead.count({ where: { status: LeadStatus.SEM_INTERESSE } }),
      prisma.lead.count({ where: { createdAt: { gte: seteDias } } }),
      prisma.lead.count({ where: { createdAt: { gte: trintaDias } } }),
      prisma.lead.groupBy({
        by: ["cidade"],
        where: { cidade: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.lead.groupBy({
        by: ["nicho"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.scrapeJob.findMany({
        orderBy: { iniciadoEm: "desc" },
        take: 5,
      }),
      prisma.lead.findMany({
        where: { scoreQualidade: { gte: 70 } },
        orderBy: { scoreQualidade: "desc" },
        take: 5,
      }),
    ]);

    const taxaContato = total > 0 ? ((contatados / total) * 100).toFixed(1) : "0.0";

    const funil = [
      { status: "Pendentes", count: pendentes },
      { status: "Msg. Gerada", count: gerados },
      { status: "Contatados", count: contatados },
      { status: "Reunião", count: reunioes },
      { status: "Sem Interesse", count: semInteresse },
    ];

    return NextResponse.json({
      success: true,
      data: {
        total,
        pendentes,
        processando,
        gerados,
        contatados,
        reunioes,
        semInteresse,
        taxaContato,
        leads7d,
        leads30d,
        funil,
        topCidades: topCidades.map((c) => ({
          cidade: c.cidade,
          count: c._count.id,
        })),
        topNichos: topNichos.map((n) => ({
          nicho: n.nicho,
          count: n._count.id,
        })),
        buscasRecentes,
        altoScore,
      },
    });
  } catch (error) {
    console.error("[GET /api/dashboard/stats]", error);
    return NextResponse.json({ success: false, error: "Erro ao carregar stats." }, { status: 500 });
  }
}
