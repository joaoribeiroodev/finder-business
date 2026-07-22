export type TemplateMensagem = "consultiva" | "direta" | "reviews";

export const TEMPLATES: Record<
  TemplateMensagem,
  { label: string; descricao: string; instrucao: string }
> = {
  consultiva: {
    label: "Consultiva",
    descricao: "Tom amigável e consultivo, sem pressão",
    instrucao:
      "Use tom consultivo e empático. Faça perguntas abertas. Evite linguagem de vendedor agressivo.",
  },
  direta: {
    label: "Direta",
    descricao: "Objetiva e direta ao ponto",
    instrucao:
      "Seja direto e objetivo. Vá ao ponto em 2 parágrafos curtos. CTA claro mas sem pressão excessiva.",
  },
  reviews: {
    label: "Foco em avaliações",
    descricao: "Menciona avaliações positivas do negócio",
    instrucao:
      "Se houver avaliação e reviews disponíveis, mencione de forma natural o bom reputação deles na região. Não invente números.",
  },
};
