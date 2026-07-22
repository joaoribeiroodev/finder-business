"use client";

import Link from "next/link";
import type { Lead, MensagemHistorico, ScrapeJob, LeadStatus } from "@prisma/client";
import { useState } from "react";
import { LeadScoreBadge } from "./LeadScoreBadge";
import { formatarTelefoneExibicao, telefoneParaWhatsApp } from "@/lib/phone";
import { TEMPLATES, type TemplateMensagem } from "@/lib/templates";
import { useToast } from "./Toast";

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "bg-yellow-900/40 text-yellow-400" },
  PROCESSANDO_IA: { label: "Processando IA", className: "bg-purple-900/40 text-purple-400" },
  MENSAGEM_GERADA: { label: "Msg. Gerada", className: "bg-blue-900/40 text-blue-400" },
  CONTATADO: { label: "Contatado", className: "bg-green-900/40 text-green-400" },
  SEM_INTERESSE: { label: "Sem Interesse", className: "bg-red-900/40 text-red-400" },
  REUNIAO_AGENDADA: { label: "Reuniao Agendada", className: "bg-emerald-900/40 text-emerald-400" },
};

type LeadComRelacoes = Lead & {
  mensagens?: MensagemHistorico[];
  scrapeJob?: ScrapeJob | null;
};

interface LeadDetailCardProps {
  lead: LeadComRelacoes;
}

export function LeadDetailCard({ lead: initialLead }: LeadDetailCardProps) {
  const [lead, setLead] = useState(initialLead);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<TemplateMensagem>("consultiva");
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? "");
  const { toast } = useToast();

  async function salvarObservacoes() {
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, observacoes }),
    });
    const json = await res.json();
    if (json.success) {
      setLead((prev) => ({ ...prev, ...json.data }));
      toast("Observacoes salvas.", "ok");
    } else {
      toast(json.error ?? "Erro ao salvar.", "erro");
    }
  }

  async function gerarMensagem(regenerar = false) {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/gerar-mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, regenerar }),
      });
      const json = await res.json();
      if (json.success) {
        setLead((prev) => ({ ...prev, ...json.data }));
        toast("Mensagem gerada!", "ok");
      } else {
        toast(json.error ?? "Erro ao gerar.", "erro");
      }
    } catch {
      toast("Falha na comunicacao.", "erro");
    } finally {
      setLoading(false);
    }
  }

  async function atualizarStatusContatado() {
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, status: "CONTATADO" }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error ?? "Erro ao atualizar status.");
    }
    setLead((prev) => ({ ...prev, ...json.data }));
  }

  async function enviarWhatsApp() {
    if (!lead.mensagemIA) return;
    const tel = telefoneParaWhatsApp(lead.telefone);
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(lead.mensagemIA)}`,
      "_blank"
    );
    try {
      await atualizarStatusContatado();
      toast("Lead marcado como contatado.", "ok");
    } catch {
      toast("Mensagem aberta, mas nao foi possivel atualizar o status.", "erro");
    }
  }

  async function copiarTelefone() {
    await navigator.clipboard.writeText(lead.telefone);
    toast("Telefone copiado!", "ok");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-300 mb-2 inline-block">
            {"<-"} Voltar para leads
          </Link>
          <h1 className="text-2xl font-bold text-white">{lead.nomeEmpresa}</h1>
          <p className="text-zinc-400 text-sm mt-1">{lead.nicho}</p>
        </div>
        <LeadScoreBadge score={lead.scoreQualidade} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Contato">
          <p className="font-mono">{formatarTelefoneExibicao(lead.telefone)}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={copiarTelefone} className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700">
              Copiar
            </button>
            {lead.urlMaps && (
              <a
                href={lead.urlMaps}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2 py-1 bg-zinc-800 rounded hover:bg-zinc-700 text-blue-400"
              >
                Google Maps
              </a>
            )}
          </div>
        </InfoCard>

        <InfoCard title="Localizacao">
          <p>{lead.endereco ?? "—"}</p>
          {(lead.bairro || lead.cidade) && (
            <p className="text-zinc-500 text-xs mt-1">
              {[lead.bairro, lead.cidade].filter(Boolean).join(", ")}
              {lead.cep && ` · CEP ${lead.cep}`}
            </p>
          )}
        </InfoCard>

        <InfoCard title="Reputacao">
          {lead.avaliacao != null ? (
            <p>⭐ {lead.avaliacao} ({lead.totalReviews ?? 0} avaliacoes)</p>
          ) : (
            <p className="text-zinc-500">Sem avaliacoes</p>
          )}
        </InfoCard>

        <InfoCard title="Horario">
          <p>{lead.horarioFunc ?? "—"}</p>
          {lead.abertoAgora != null && (
            <p className={`text-xs mt-1 ${lead.abertoAgora ? "text-green-400" : "text-red-400"}`}>
              {lead.abertoAgora ? "Aberto agora" : "Fechado"}
            </p>
          )}
        </InfoCard>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Observacoes</h3>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
        />
        <button onClick={salvarObservacoes} className="mt-2 text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg">
          Salvar observacoes
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">Mensagem IA</h3>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateMensagem)}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white"
          >
            {Object.entries(TEMPLATES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {lead.mensagemIA ? (
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed mb-4">
            {lead.mensagemIA}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 mb-4">Nenhuma mensagem gerada ainda.</p>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => gerarMensagem(false)}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-white"
          >
            {loading ? "Gerando..." : "🤖 Gerar msg"}
          </button>
          {lead.mensagemIA && (
            <>
              <button
                onClick={() => gerarMensagem(true)}
                disabled={loading}
                className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
              >
                🔄 Regenerar
              </button>
              <button
                onClick={enviarWhatsApp}
                className="text-xs px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-white"
              >
                💬 WhatsApp
              </button>
            </>
          )}
        </div>
      </div>

      {lead.mensagens && lead.mensagens.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Historico de mensagens</h3>
          <div className="space-y-3">
            {lead.mensagens.map((m) => (
              <div key={m.id} className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-xs text-zinc-500 mb-1">
                  {m.template ?? "consultiva"} · {new Date(m.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{m.conteudo}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-600 flex gap-4">
        <span>Status: {STATUS_CONFIG[lead.status].label}</span>
        {lead.termoBusca && <span>Busca: &quot;{lead.termoBusca}&quot;</span>}
        <span>Criado: {new Date(lead.createdAt).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="text-sm text-zinc-200">{children}</div>
    </div>
  );
}
