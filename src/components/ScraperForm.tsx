"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScrapeJob } from "@prisma/client";
import { ScrapeJobStatusBar } from "./ScrapeJobStatus";
import { useToast } from "./Toast";

interface ScraperFormProps {
  onComplete?: () => void;
}

export function ScraperForm({ onComplete }: ScraperFormProps) {
  const [termo, setTermo] = useState("");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const { toast } = useToast();

  const pollJob = useCallback(
    async (jobId: string) => {
      const res = await fetch(`/api/scraper/${jobId}`);
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
        if (json.data.status === "CONCLUIDO") {
          toast(
            `Busca concluída: ${json.data.totalInseridos} lead(s) inserido(s).`,
            "ok"
          );
          onComplete?.();
          return true;
        }
        if (json.data.status === "ERRO") {
          toast(json.data.erro ?? "Erro na busca.", "erro");
          return true;
        }
      }
      return false;
    },
    [toast, onComplete]
  );

  useEffect(() => {
    if (!job || job.status === "CONCLUIDO" || job.status === "ERRO") return;

    const interval = setInterval(async () => {
      const done = await pollJob(job.id);
      if (done) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [job, pollJob]);

  async function handleDispararScraping() {
    if (!termo.trim()) return;

    setLoading(true);
    setJob(null);

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termo: termo.trim() }),
      });
      const json = await res.json();

      if (json.success) {
        toast(json.message ?? "Busca iniciada!", "ok");
        setTermo("");
        const statusRes = await fetch(`/api/scraper/${json.jobId}`);
        const statusJson = await statusRes.json();
        if (statusJson.success) setJob(statusJson.data);
      } else {
        toast(json.error ?? "Erro ao iniciar busca.", "erro");
      }
    } catch {
      toast("Falha na comunicação com o servidor.", "erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-base font-semibold text-white mb-1">Nova Pesquisa</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Informe um segmento e cidade para buscar empresas sem site no Google Maps.
      </p>

      <div className="flex gap-3">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDispararScraping()}
          placeholder='Ex: "Clínicas em Salvador"'
          disabled={loading || job?.status === "RODANDO"}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleDispararScraping}
          disabled={loading || !termo.trim() || job?.status === "RODANDO"}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg"
        >
          {loading || job?.status === "RODANDO" ? "Buscando…" : "🔍 Buscar"}
        </button>
      </div>

      <ScrapeJobStatusBar job={job} />
    </div>
  );
}
