import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarMensagemProspeccao, leadParaDadosIA } from "@/lib/openai";
import { gerarMensagensLoteSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = gerarMensagensLoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Parâmetros inválidos." },
        { status: 400 }
      );
    }

    const { leadIds, template, apenasPendentes } = parsed.data;
    const env = getEnv();

    const leads = await prisma.lead.findMany({
      where: leadIds
        ? { id: { in: leadIds } }
        : apenasPendentes
          ? { status: "PENDENTE" }
          : {},
      take: 50,
    });

    let gerados = 0;
    const erros: string[] = [];

    for (const lead of leads) {
      try {
        const rate = await checkRateLimit("openai", env.RATE_LIMIT_OPENAI);
        if (!rate.ok) {
          erros.push(lead.nomeEmpresa);
          continue;
        }

        await prisma.lead.update({ where: { id: lead.id }, data: { status: "PROCESSANDO_IA" } });
        const mensagemIA = await gerarMensagemProspeccao(leadParaDadosIA(lead), template);
        await prisma.$transaction([
          prisma.lead.update({
            where: { id: lead.id },
            data: { mensagemIA, status: "MENSAGEM_GERADA" },
          }),
          prisma.mensagemHistorico.create({
            data: { leadId: lead.id, conteudo: mensagemIA, template },
          }),
        ]);
        gerados += 1;
      } catch (e) {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: "PENDENTE" } }).catch(() => null);
        erros.push(lead.nomeEmpresa);
      }
    }

    return NextResponse.json({
      success: true,
      gerados,
      erros: erros.length,
      nomesComErro: erros,
    });
  } catch (error) {
    console.error("[POST /api/leads/gerar-mensagens]", error);
    return NextResponse.json({ success: false, error: "Erro na geração em lote." }, { status: 500 });
  }
}
