export interface DadosScore {
  temSite: boolean;
  avaliacao?: number | null;
  totalReviews?: number | null;
  telefone: string;
  endereco?: string | null;
  cidade?: string | null;
  horarioFunc?: string | null;
}

export function calcularScoreQualidade(dados: DadosScore): number {
  let score = 0;

  if (!dados.temSite) score += 20;
  if (dados.avaliacao != null && dados.avaliacao >= 4.0) score += 15;
  if (dados.totalReviews != null && dados.totalReviews >= 10) score += 15;
  if (dados.telefone.replace(/\D/g, "").length >= 10) score += 10;
  if (dados.endereco && dados.endereco.trim().length > 10) score += 10;
  if (dados.cidade && dados.cidade.trim().length > 0) score += 10;
  if (dados.horarioFunc && dados.horarioFunc.trim().length > 0) score += 10;
  if (dados.totalReviews != null && dados.totalReviews > 0) score += 10;

  return Math.min(score, 100);
}

export function scoreCor(score: number | null | undefined): string {
  if (score == null) return "bg-zinc-700 text-zinc-300";
  if (score >= 70) return "bg-green-900/50 text-green-400";
  if (score >= 40) return "bg-yellow-900/50 text-yellow-400";
  return "bg-red-900/50 text-red-400";
}
