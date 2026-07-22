"use client";

import { useEffect, useState } from "react";
import { FunnelChart } from "./FunnelChart";
import { LeadScoreBadge } from "./LeadScoreBadge";
import Link from "next/link";

interface DashboardStats {
  total: number;
  pendentes: number;
  contatados: number;
  reunioes: number;
  taxaContato: string;
  leads7d: number;
  leads30d: number;
  funil: { status: string; count: number }[];
  topCidades: { cidade: string | null; count: number }[];
  topNichos: { nicho: string; count: number }[];
  buscasRecentes: {
    id: string;
    termo: string;
    status: string;
    totalInseridos: number;
    iniciadoEm: string;
  }[];
  altoScore: {
    id: string;
    nomeEmpresa: string;
    scoreQualidade: number | null;
    cidade: string | null;
  }[];
}

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((j) => j.success && setStats(j.data));
  }, []);

  if (!stats) {
    return <p className="text-zinc-500 text-sm">Carregando dashboard…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total" value={stats.total} emoji="🗃️" />
        <MetricCard label="Pendentes" value={stats.pendentes} emoji="⏳" />
        <MetricCard label="Contatados" value={stats.contatados} emoji="✅" />
        <MetricCard label="Reuniões" value={stats.reunioes} emoji="📅" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Taxa de contato</p>
          <p className="text-3xl font-bold text-white">{stats.taxaContato}%</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Últimos 7 dias</p>
          <p className="text-3xl font-bold text-white">{stats.leads7d}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm text-zinc-400 mb-1">Últimos 30 dias</p>
          <p className="text-3xl font-bold text-white">{stats.leads30d}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Funil de prospecção</h3>
          <FunnelChart data={stats.funil} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top cidades</h3>
          <ul className="space-y-2">
            {stats.topCidades.map((c) => (
              <li key={c.cidade} className="flex justify-between text-sm">
                <span className="text-zinc-300">{c.cidade}</span>
                <span className="text-zinc-500">{c.count}</span>
              </li>
            ))}
            {stats.topCidades.length === 0 && (
              <li className="text-zinc-500 text-sm">Sem dados</li>
            )}
          </ul>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Top nichos</h3>
          <ul className="space-y-2">
            {stats.topNichos.map((n) => (
              <li key={n.nicho} className="flex justify-between text-sm">
                <span className="text-zinc-300 truncate mr-2">{n.nicho}</span>
                <span className="text-zinc-500 shrink-0">{n.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Leads alto score</h3>
          <ul className="space-y-2">
            {stats.altoScore.map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <Link href={`/leads/${l.id}`} className="text-zinc-300 hover:text-white truncate mr-2">
                  {l.nomeEmpresa}
                </Link>
                <LeadScoreBadge score={l.scoreQualidade} />
              </li>
            ))}
            {stats.altoScore.length === 0 && (
              <li className="text-zinc-500 text-sm">Nenhum lead com score ≥ 70</li>
            )}
          </ul>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Buscas recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                <th className="text-left py-2">Termo</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Inseridos</th>
                <th className="text-left py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {stats.buscasRecentes.map((b) => (
                <tr key={b.id} className="border-b border-zinc-800/50">
                  <td className="py-2 text-zinc-300">{b.termo}</td>
                  <td className="py-2 text-zinc-400">{b.status}</td>
                  <td className="py-2 text-zinc-400">{b.totalInseridos}</td>
                  <td className="py-2 text-zinc-500 text-xs">
                    {new Date(b.iniciadoEm).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <span className="text-2xl">{emoji}</span>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}
