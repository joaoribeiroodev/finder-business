"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Lead, LeadStatus } from "@prisma/client";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { LeadFilters, type LeadFiltersState } from "./LeadFilters";
import { useToast } from "./Toast";
import { ExportLeadsButton } from "./ExportLeadsButton";
import { telefoneParaWhatsApp } from "@/lib/phone";

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "bg-yellow-900/40 text-yellow-400" },
  PROCESSANDO_IA: { label: "Processando IA", className: "bg-purple-900/40 text-purple-400" },
  MENSAGEM_GERADA: { label: "Msg. Gerada", className: "bg-blue-900/40 text-blue-400" },
  CONTATADO: { label: "Contatado", className: "bg-green-900/40 text-green-400" },
  SEM_INTERESSE: { label: "Sem Interesse", className: "bg-red-900/40 text-red-400" },
  REUNIAO_AGENDADA: { label: "Reunião Agendada", className: "bg-emerald-900/40 text-emerald-400" },
};

interface LeadPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface LeadTableProps {
  initialLeads: Lead[];
  initialPagination: LeadPagination;
}

export function LeadTable({ initialLeads, initialPagination }: LeadTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [pagination, setPagination] = useState<LeadPagination>(initialPagination);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [filters, setFilters] = useState<LeadFiltersState>({
    q: "",
    status: "",
    cidade: "",
    scoreMin: "",
  });
  const [page, setPage] = useState(initialPagination.page);
  const { toast } = useToast();

  const fetchLeads = useCallback(
    async (pageToFetch: number) => {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.status) params.set("status", filters.status);
      if (filters.cidade) params.set("cidade", filters.cidade);
      if (filters.scoreMin) params.set("scoreMin", filters.scoreMin);
      params.set("page", String(pageToFetch));
      params.set("limit", String(initialPagination.limit));

      const res = await fetch(`/api/leads?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        setPagination(json.pagination);
        setPage(json.pagination.page);
      } else {
        throw new Error(json.error ?? "Erro ao buscar leads.");
      }
    },
    [filters, initialPagination.limit]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchLeads(page).catch(() => toast("Falha ao carregar leads.", "erro"));
    }, 300);
    return () => clearTimeout(t);
  }, [fetchLeads, page, toast]);

  async function handleAtualizarLista() {
    setRefreshing(true);
    try {
      await fetchLeads(page);
    } catch {
      toast("Falha ao atualizar.", "erro");
    } finally {
      setRefreshing(false);
    }
  }

  async function atualizarStatusLocal(leadId: string, novoStatus: LeadStatus) {
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: novoStatus }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error ?? "Erro ao atualizar status.");
    }

    setLeads((prev) => prev.map((l) => (l.id === leadId ? json.data : l)));
    return json.data as Lead;
  }

  async function handleGerarMensagem(lead: Lead) {
    setLoadingId(lead.id);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, status: "PROCESSANDO_IA" as LeadStatus } : l
      )
    );

    try {
      const res = await fetch(`/api/leads/${lead.id}/gerar-mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "consultiva" }),
      });
      const json = await res.json();
      if (json.success) {
        setLeads((prev) => prev.map((l) => (l.id === lead.id ? json.data : l)));
        toast("Mensagem gerada!", "ok");
      } else {
        await fetchLeads(page);
        toast(json.error ?? "Erro ao gerar.", "erro");
      }
    } catch {
      await fetchLeads(page);
      toast("Falha na comunicação.", "erro");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleGerarTodasPendentes() {
    setBatchLoading(true);
    try {
      const res = await fetch("/api/leads/gerar-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apenasPendentes: true, template: "consultiva" }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`${json.gerados} mensagem(ns) gerada(s).`, "ok");
        await fetchLeads(page);
      } else {
        toast(json.error ?? "Erro no lote.", "erro");
      }
    } catch {
      toast("Falha na geração em lote.", "erro");
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleEnviarWhatsApp(lead: Lead) {
    if (!lead.mensagemIA) return;

    window.open(
      `https://wa.me/${telefoneParaWhatsApp(lead.telefone)}?text=${encodeURIComponent(lead.mensagemIA)}`,
      "_blank"
    );

    try {
      await atualizarStatusLocal(lead.id, "CONTATADO");
      toast("Lead marcado como contatado.", "ok");
    } catch {
      toast("Mensagem aberta, mas não foi possível atualizar o status.", "erro");
    }
  }

  async function handleMudarStatus(lead: Lead, novoStatus: LeadStatus) {
    try {
      await atualizarStatusLocal(lead.id, novoStatus);
    } catch {
      toast("Não foi possível atualizar o status.", "erro");
    }
  }

  const handleFilterChange = (next: LeadFiltersState) => {
    setPage(1);
    setFilters(next);
  };

  const canPrev = page > 1;
  const canNext = page < pagination.totalPages;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">
            Leads <span className="text-zinc-500 font-normal text-sm">({pagination.total})</span>
          </h2>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={handleGerarTodasPendentes}
              disabled={batchLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 disabled:opacity-50 text-white"
            >
              {batchLoading ? "Gerando..." : "🤖 Gerar pendentes"}
            </button>
            <ExportLeadsButton
              tipo="planilha"
              filters={filters}
              label="📋 Exportar Planilha"
            />
            <ExportLeadsButton
              tipo="relatorio"
              filters={filters}
              label="📊 Exportar Relatório"
            />
            <button
              onClick={handleAtualizarLista}
              disabled={refreshing}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300"
            >
              {refreshing ? "..." : "↻"}
            </button>
          </div>
        </div>
        <LeadFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {leads.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 text-sm">
          Nenhum lead encontrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                <th className="text-left px-6 py-3">Empresa</th>
                <th className="text-left px-6 py-3">Cidade</th>
                <th className="text-left px-6 py-3">Score</th>
                <th className="text-left px-6 py-3">⭐</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const statusCfg = STATUS_CONFIG[lead.status];
                const isLoading = loadingId === lead.id;
                const isExpandido = expandidoId === lead.id;

                return (
                  <Fragment key={lead.id}>
                    <tr className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                      <td className="px-6 py-4">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-white hover:text-blue-400">
                          {lead.nomeEmpresa}
                        </Link>
                        <p className="text-xs text-zinc-500">{lead.nicho}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">{lead.cidade ?? "—"}</td>
                      <td className="px-6 py-4"><LeadScoreBadge score={lead.scoreQualidade} /></td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {lead.avaliacao != null ? `${lead.avaliacao}` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleMudarStatus(lead, e.target.value as LeadStatus)}
                          className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer ${statusCfg.className} bg-transparent`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                            <option key={k} value={k} className="bg-zinc-800">{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {lead.mensagemIA && (
                            <button
                              onClick={() => setExpandidoId(isExpandido ? null : lead.id)}
                              className="text-xs px-2 py-1 bg-zinc-800 rounded-lg"
                            >
                              {isExpandido ? "Fechar" : "Msg"}
                            </button>
                          )}
                          {lead.status === "PENDENTE" && (
                            <button
                              onClick={() => handleGerarMensagem(lead)}
                              disabled={isLoading}
                              className="text-xs px-2 py-1 bg-purple-700 rounded-lg text-white disabled:opacity-50"
                            >
                              {isLoading ? "..." : "🤖"}
                            </button>
                          )}
                          {lead.status === "MENSAGEM_GERADA" && lead.mensagemIA && (
                            <button
                              onClick={() => handleEnviarWhatsApp(lead)}
                              className="text-xs px-2 py-1 bg-green-700 rounded-lg text-white"
                            >
                              💬
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpandido && lead.mensagemIA && (
                      <tr className="bg-zinc-800/30">
                        <td colSpan={6} className="px-6 py-4">
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{lead.mensagemIA}</p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-6 py-4 text-sm text-zinc-400">
        <span>
          Página {pagination.page} de {pagination.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={!canPrev}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((current) => Math.min(current + 1, pagination.totalPages))}
            disabled={!canNext}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
