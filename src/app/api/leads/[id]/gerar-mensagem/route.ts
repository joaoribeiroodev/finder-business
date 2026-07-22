import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarMensagemProspeccao, leadParaDadosIA } from "@/lib/openai";
import { gerarMensagemSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const { id } = params;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = gerarMensagemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Parâmetros inválidos." },
        { status: 400 }
      );
    }

    const { template, regenerar } = parsed.data;
    const env = getEnv();
    const rate = await checkRateLimit("openai", env.RATE_LIMIT_OPENAI);
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, error: "Limite de gerações atingido. Aguarde." },
        { status: 429 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead não encontrado." }, { status: 404 });
    }

    if (!regenerar && lead.status === "MENSAGEM_GERADA" && lead.mensagemIA) {
      return NextResponse.json({ success: true, message: "Mensagem já gerada.", data: lead });
    }

    await prisma.lead.update({ where: { id }, data: { status: "PROCESSANDO_IA" } });

    const mensagemIA = await gerarMensagemProspeccao(leadParaDadosIA(lead), template);

    const [leadAtualizado] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: { mensagemIA, status: "MENSAGEM_GERADA" },
      }),
      prisma.mensagemHistorico.create({
        data: { leadId: id, conteudo: mensagemIA, template },
      }),
    ]);

    return NextResponse.json({ success: true, data: leadAtualizado });
  } catch (error) {
    console.error(`[POST /api/leads/${id}/gerar-mensagem]`, error);
    await prisma.lead.update({ where: { id }, data: { status: "PENDENTE" } }).catch(() => null);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar mensagem.",
      },
      { status: 500 }
    );
  }
}
