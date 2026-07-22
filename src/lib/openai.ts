import type { Lead } from "@prisma/client";
import { getEnv, requireOpenAIKey } from "./env";
import type { TemplateMensagem } from "./templates";
import { TEMPLATES } from "./templates";

export interface DadosLeadIA {
  nomeEmpresa: string;
  nicho: string;
  cidade?: string | null;
  bairro?: string | null;
  endereco?: string | null;
  avaliacao?: number | null;
  totalReviews?: number | null;
  horarioFunc?: string | null;
  abertoAgora?: boolean | null;
  termoBusca?: string | null;
}

export function leadParaDadosIA(lead: Lead): DadosLeadIA {
  return {
    nomeEmpresa: lead.nomeEmpresa,
    nicho: lead.nicho,
    cidade: lead.cidade,
    bairro: lead.bairro,
    endereco: lead.endereco,
    avaliacao: lead.avaliacao,
    totalReviews: lead.totalReviews,
    horarioFunc: lead.horarioFunc,
    abertoAgora: lead.abertoAgora,
    termoBusca: lead.termoBusca,
  };
}

function construirSystemPrompt(dados: DadosLeadIA, template: TemplateMensagem): string {
  const tpl = TEMPLATES[template];
  const local = [dados.bairro, dados.cidade].filter(Boolean).join(", ");
  const reviews =
    dados.avaliacao != null
      ? `Avaliação: ${dados.avaliacao} estrelas${dados.totalReviews ? ` (${dados.totalReviews} avaliações)` : ""}.`
      : "";
  const horario = dados.horarioFunc
    ? `Horário: ${dados.horarioFunc}${dados.abertoAgora ? " (aberto agora)" : ""}.`
    : "";

  return `Você é especialista em redação comercial B2B (Cold Outreach) para WhatsApp.

Dados do lead:
- Empresa: ${dados.nomeEmpresa}
- Nicho: ${dados.nicho}
- Local: ${local || dados.endereco || "região não especificada"}
- Status: Não possui site próprio na internet.
${reviews ? `- ${reviews}` : ""}
${horario ? `- ${horario}` : ""}
${dados.termoBusca ? `- Contexto da busca: "${dados.termoBusca}"` : ""}

Estilo (${tpl.label}): ${tpl.instrucao}

Regras anti-alucinação:
1. NUNCA invente nome de proprietário ou funcionário.
2. NUNCA cite problemas de site atual - eles NÃO têm site.
3. NUNCA invente faturamento, prêmios ou histórico fictício.
4. NÃO mencione robô, bot ou scraper.
5. Use apenas dados fornecidos acima.

Formatação: máximo 3 parágrafos curtos, quebras duplas entre parágrafos, tom profissional pt-BR.
Retorne APENAS o texto da mensagem, sem introduções ou markdown.`;
}

function extrairMensagem(responseJson: unknown): string | null {
  const choices = (responseJson as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim() || null;
  }
  return null;
}

export async function gerarMensagemProspeccao(
  dados: DadosLeadIA,
  template: TemplateMensagem = "consultiva"
): Promise<string> {
  const env = getEnv();
  const systemPrompt = construirSystemPrompt(dados, template);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAIKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Gere mensagem para ${dados.nomeEmpresa} (${dados.nicho})`,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; choices?: Array<{ message?: { content?: unknown } }> }
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ??
        `Falha na API da OpenAI (${response.status} ${response.statusText}).`
    );
  }

  const texto = extrairMensagem(payload);
  if (!texto) throw new Error("A API da OpenAI retornou uma resposta vazia.");
  return texto.trim();
}
