"use client";

import type { ScrapeJob } from "@prisma/client";
import { ExportLeadsButton } from "./ExportLeadsButton";

interface ScrapeJobStatusProps {
  job: ScrapeJob | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Aguardando…",
  RODANDO: "Coletando dados…",
  CONCLUIDO: "Concluído",
  ERRO: "Erro",
};

export function ScrapeJobStatusBar({ job }: ScrapeJobStatusProps) {
  if (!job) return null;

  const cores: Record<string, string> = {
    PENDENTE: "text-yellow-400",
    RODANDO: "text-blue-400",
    CONCLUIDO: "text-green-400",
    ERRO: "text-red-400",
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={cores[job.status] ?? "text-zinc-400"}>
          {STATUS_LABEL[job.status] ?? job.status}
          {job.status === "RODANDO" && (
            <span className="ml-2 inline-block animate-pulse">●</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {job.status === "CONCLUIDO" && (
            <span className="text-zinc-400 text-xs">
              {job.totalInseridos} lead(s) · {job.totalDescartados} descartado(s)
            </span>
          )}
          {job.status === "CONCLUIDO" && job.totalInseridos > 0 && (
            <ExportLeadsButton
              tipo="planilha"
              scrapeJobId={job.id}
              label="📋 Baixar planilha"
              className="text-xs px-2.5 py-1 rounded-md bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white"
            />
          )}
        </div>
      </div>
      {job.erro && (
        <p className="text-red-400 text-xs mt-1">{job.erro}</p>
      )}
    </div>
  );
}
