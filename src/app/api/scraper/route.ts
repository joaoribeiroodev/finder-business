import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executarScraping } from "@/lib/playwright";
import { scraperPostSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEnv } from "@/lib/env";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const jobs = await prisma.scrapeJob.findMany({
      orderBy: { iniciadoEm: "desc" },
      take: 20,
    });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    console.error("[GET /api/scraper]", error);
    return NextResponse.json({ success: false, error: "Erro ao listar buscas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = scraperPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const { termo } = parsed.data;
    const env = getEnv();
    const rate = await checkRateLimit("scraper", env.RATE_LIMIT_SCRAPER);
    if (!rate.ok) {
      return NextResponse.json(
        { success: false, error: "Limite de buscas atingido. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const job = await prisma.scrapeJob.create({
      data: { termo: termo.trim(), status: "PENDENTE" },
    });

    executarScraping(job.id, termo.trim()).catch((err) => {
      console.error(`[Scraper] Job ${job.id} falhou:`, err);
    });

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: `Busca iniciada para "${termo.trim()}".`,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[POST /api/scraper]", error);
    return NextResponse.json({ success: false, error: "Erro ao iniciar busca." }, { status: 500 });
  }
}
