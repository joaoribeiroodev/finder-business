"use client";

import type { ScrapeJob } from "@prisma/client";
import { ExportLeadsButton } from "./ExportLeadsButton";

interface BuscasTableProps {
  jobs: ScrapeJob[];
}

function StatusBadge({ status }: { status: string }) {
  const cores: Record<string, string> = {
    PENDENTE: "bg-yellow-900/40 text-yellow-400",
    RODANDO: "bg-blue-900/40 text-blue-400",
    CONCLUIDO: "bg-green-900/40 text-green-400",
    ERRO: "bg-red-900/40 text-red-400",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-md ${cores[status] ?? "bg-zinc-800 text-zinc-400"}`}>
      {status}
    </span>
  );
}

export function BuscasTable({ jobs }: BuscasTableProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
            <th className="text-left px-6 py-3">Termo</th>
            <th className="text-left px-6 py-3">Status</th>
            <th className="text-left px-6 py-3">Encontrados</th>
            <th className="text-left px-6 py-3">Inseridos</th>
            <th className="text-left px-6 py-3">Descartados</th>
            <th className="text-left px-6 py-3">Data</th>
            <th className="text-right px-6 py-3">Exportar</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                Nenhuma busca realizada ainda.
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30">
                <td className="px-6 py-4 text-white">{job.termo}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-6 py-4 text-zinc-400">{job.totalEncontrados}</td>
                <td className="px-6 py-4 text-green-400">{job.totalInseridos}</td>
                <td className="px-6 py-4 text-zinc-500">{job.totalDescartados}</td>
                <td className="px-6 py-4 text-zinc-500 text-xs">
                  {new Date(job.iniciadoEm).toLocaleString("pt-BR")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {job.status === "CONCLUIDO" && job.totalInseridos > 0 ? (
                      <>
                        <ExportLeadsButton
                          tipo="planilha"
                          scrapeJobId={job.id}
                          label="📋 Planilha"
                          className="text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300"
                        />
                        <ExportLeadsButton
                          tipo="relatorio"
                          scrapeJobId={job.id}
                          label="📊 Relatório"
                          className="text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300"
                        />
                      </>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
