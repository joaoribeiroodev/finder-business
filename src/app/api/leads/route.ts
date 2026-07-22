import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  leadCreateSchema,
  leadPatchSchema,
  leadQuerySchema,
} from "@/lib/validations";
import { normalizarTelefone } from "@/lib/phone";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

function buildWhere(query: ReturnType<typeof leadQuerySchema.parse>): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.cidade) where.cidade = { contains: query.cidade, mode: "insensitive" };
  if (query.nicho) where.nicho = { contains: query.nicho, mode: "insensitive" };
  if (query.scoreMin != null) where.scoreQualidade = { gte: query.scoreMin };
  if (query.q) {
    where.OR = [
      { nomeEmpresa: { contains: query.q, mode: "insensitive" } },
      { telefone: { contains: query.q } },
      { endereco: { contains: query.q, mode: "insensitive" } },
      { cidade: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = leadQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Parâmetros de busca inválidos." },
        { status: 400 }
      );
    }

    const { page, limit, orderBy, order } = parsed.data;
    const where = buildWhere(parsed.data);
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [orderBy]: order },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/leads]", error);
    return NextResponse.json({ success: false, error: "Erro ao buscar leads." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    const data = [];

    for (const item of items) {
      const parsed = leadCreateSchema.safeParse(item);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0]?.message ?? "Lead inválido." },
          { status: 400 }
        );
      }
      data.push({
        ...parsed.data,
        telefone: normalizarTelefone(parsed.data.telefone),
      });
    }

    const criados = await prisma.lead.createMany({ data, skipDuplicates: true });
    return NextResponse.json({ success: true, count: criados.count }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/leads]", error);
    return NextResponse.json({ success: false, error: "Erro ao criar lead(s)." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = leadPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const { id, ...campos } = parsed.data;
    const data: Prisma.LeadUpdateInput = { ...campos };

    if (campos.status === "CONTATADO") {
      data.contatadoEm = new Date();
    }

    const atualizado = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: atualizado });
  } catch (error) {
    console.error("[PATCH /api/leads]", error);
    return NextResponse.json({ success: false, error: "Erro ao atualizar lead." }, { status: 500 });
  }
}
