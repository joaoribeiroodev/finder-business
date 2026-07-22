import { NextRequest, NextResponse } from "next/server";

import { Prisma, type Lead } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { leadExportQuerySchema, type LeadQuery } from "@/lib/validations";

import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

import { gerarPlanilhaLeadsXlsx, gerarRelatorioXlsx } from "@/lib/export-xlsx";



export const dynamic = "force-dynamic";



function buildWhere(

  query: Pick<LeadQuery, "status" | "cidade" | "nicho" | "q" | "scoreMin"> & {

    scrapeJobId?: string;

  }

): Prisma.LeadWhereInput {

  const where: Prisma.LeadWhereInput = {};

  if (query.status) where.status = query.status;

  if (query.cidade) where.cidade = { contains: query.cidade, mode: "insensitive" };

  if (query.nicho) where.nicho = { contains: query.nicho, mode: "insensitive" };

  if (query.scoreMin != null) where.scoreQualidade = { gte: query.scoreMin };

  if (query.scrapeJobId) where.scrapeJobId = query.scrapeJobId;

  if (query.q) {

    where.OR = [

      { nomeEmpresa: { contains: query.q, mode: "insensitive" } },

      { telefone: { contains: query.q } },

      { cidade: { contains: query.q, mode: "insensitive" } },

    ];

  }

  return where;

}



function slugifyTermo(termo: string): string {

  return (

    termo

      .slice(0, 40)

      .normalize("NFD")

      .replace(/[\u0300-\u036f]/g, "")

      .replace(/[^a-zA-Z0-9]+/g, "-")

      .replace(/^-|-$/g, "")

      .toLowerCase() || "busca"

  );

}



export async function GET(req: NextRequest) {

  if (!isAuthenticated(req)) return unauthorizedResponse();



  try {

    const params = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = leadExportQuerySchema.safeParse(params);

    if (!parsed.success) {

      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });

    }



    const { tipo, scrapeJobId, ...filtros } = parsed.data;



    const where = buildWhere(parsed.data);
    const orderBy = { scoreQualidade: "desc" as const };
    const batchSize = 1000;
    const leads: Lead[] = [];
    let skip = 0;

    while (true) {
      const batch = await prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: batchSize,
      });

      leads.push(...batch);

      if (batch.length < batchSize) break;
      skip += batchSize;
    }



    if (leads.length === 0) {

      return NextResponse.json(

        { success: false, error: "Nenhum lead encontrado para exportar." },

        { status: 404 }

      );

    }



    const buffer =

      tipo === "relatorio"

        ? await gerarRelatorioXlsx({ leads, filtros })

        : await gerarPlanilhaLeadsXlsx(leads);



    let termoSlug = "";

    if (scrapeJobId) {

      const job = await prisma.scrapeJob.findUnique({

        where: { id: scrapeJobId },

        select: { termo: true },

      });

      if (job) termoSlug = `-${slugifyTermo(job.termo)}`;

    }



    const dataStr = new Date().toISOString().slice(0, 10);

    const prefix = tipo === "relatorio" ? "relatorio" : "planilha";

    const filename = `finder-business-${prefix}${termoSlug}-${dataStr}.xlsx`;



    return new NextResponse(new Uint8Array(buffer), {

      headers: {

        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition": `attachment; filename="${filename}"`,

      },

    });

  } catch (error) {

    console.error("[GET /api/leads/export]", error);

    return NextResponse.json({ success: false, error: "Erro ao exportar." }, { status: 500 });

  }

}

