"use client";

import { useState } from "react";
import { useToast } from "./Toast";
import type { LeadFiltersState } from "./LeadFilters";

type ExportTipo = "planilha" | "relatorio";

interface ExportLeadsButtonProps {
  tipo?: ExportTipo;
  scrapeJobId?: string;
  filters?: Partial<LeadFiltersState>;
  label?: string;
  className?: string;
  filenamePrefix?: string;
}

function montarParams(
  tipo: ExportTipo,
  filters?: Partial<LeadFiltersState>,
  scrapeJobId?: string
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("tipo", tipo);
  if (scrapeJobId) params.set("scrapeJobId", scrapeJobId);
  if (filters?.q) params.set("q", filters.q);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.cidade) params.set("cidade", filters.cidade);
  if (filters?.scoreMin) params.set("scoreMin", filters.scoreMin);
  return params;
}

export async function baixarExportacaoLeads(
  params: URLSearchParams,
  fallbackFilename: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/leads/export?${params}`);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.error ?? "Erro ao exportar." };
  }

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export function ExportLeadsButton({
  tipo = "planilha",
  scrapeJobId,
  filters,
  label,
  className,
  filenamePrefix,
}: ExportLeadsButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const defaultLabel =
    tipo === "relatorio" ? "📊 Relatório" : "📋 Planilha";
  const prefix = filenamePrefix ?? (tipo === "relatorio" ? "relatorio" : "planilha");

  async function handleExport() {
    setLoading(true);
    try {
      const params = montarParams(tipo, filters, scrapeJobId);
      const dataStr = new Date().toISOString().slice(0, 10);
      const result = await baixarExportacaoLeads(
        params,
        `finder-business-${prefix}-${dataStr}.xlsx`
      );

      if (!result.ok) {
        toast(result.error, "erro");
        return;
      }

      toast(
        tipo === "relatorio"
          ? "Relatório exportado com sucesso."
          : "Planilha de leads exportada com sucesso.",
        "ok"
      );
    } catch {
      toast("Erro ao exportar.", "erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className={
        className ??
        "text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300"
      }
    >
      {loading ? "Exportando…" : (label ?? defaultLabel)}
    </button>
  );
}
