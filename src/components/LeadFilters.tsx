"use client";

import type { LeadStatus } from "@prisma/client";

export interface LeadFiltersState {
  q: string;
  status: LeadStatus | "";
  cidade: string;
  scoreMin: string;
}

interface LeadFiltersProps {
  filters: LeadFiltersState;
  onChange: (filters: LeadFiltersState) => void;
}

const STATUS_OPTIONS: { value: LeadStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "PROCESSANDO_IA", label: "Processando IA" },
  { value: "MENSAGEM_GERADA", label: "Msg. Gerada" },
  { value: "CONTATADO", label: "Contatado" },
  { value: "SEM_INTERESSE", label: "Sem Interesse" },
  { value: "REUNIAO_AGENDADA", label: "Reunião Agendada" },
];

export function LeadFilters({ filters, onChange }: LeadFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <input
        type="text"
        placeholder="Buscar nome, telefone, cidade…"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
      />
      <select
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as LeadStatus | "" })
        }
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Filtrar por cidade"
        value={filters.cidade}
        onChange={(e) => onChange({ ...filters, cidade: e.target.value })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
      />
      <select
        value={filters.scoreMin}
        onChange={(e) => onChange({ ...filters, scoreMin: e.target.value })}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
      >
        <option value="">Qualquer score</option>
        <option value="40">Score ≥ 40</option>
        <option value="70">Score ≥ 70</option>
        <option value="85">Score ≥ 85</option>
      </select>
    </div>
  );
}
