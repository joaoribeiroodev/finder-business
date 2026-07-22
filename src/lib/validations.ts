import { z } from "zod";
import { LeadStatus } from "@prisma/client";

export const leadStatusEnum = z.nativeEnum(LeadStatus);

export const scraperPostSchema = z.object({
  termo: z.string().min(2, "Termo deve ter pelo menos 2 caracteres.").max(200),
});

export const leadCreateSchema = z.object({
  nomeEmpresa: z.string().min(1),
  nicho: z.string().min(1),
  telefone: z.string().min(8),
  endereco: z.string().optional(),
  temSite: z.boolean().optional(),
  urlSite: z.string().optional(),
  cidade: z.string().optional(),
  observacoes: z.string().optional(),
});

export const leadPatchSchema = z.object({
  id: z.string().uuid(),
  status: leadStatusEnum.optional(),
  observacoes: z.string().optional().nullable(),
  mensagemIA: z.string().optional().nullable(),
});

export const leadFilterSchema = z.object({
  status: leadStatusEnum.optional(),
  cidade: z.string().optional(),
  nicho: z.string().optional(),
  q: z.string().optional(),
  scoreMin: z.coerce.number().int().min(0).max(100).optional(),
});

export const leadQuerySchema = leadFilterSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.enum(["createdAt", "scoreQualidade", "avaliacao", "nomeEmpresa"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const leadExportQuerySchema = leadFilterSchema.extend({
  tipo: z.enum(["planilha", "relatorio"]).default("planilha"),
  scrapeJobId: z.string().uuid().optional(),
});

export const gerarMensagemSchema = z.object({
  template: z.enum(["consultiva", "direta", "reviews"]).default("consultiva"),
  regenerar: z.boolean().default(false),
});

export const gerarMensagensLoteSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(50).optional(),
  template: z.enum(["consultiva", "direta", "reviews"]).default("consultiva"),
  apenasPendentes: z.boolean().default(true),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;
