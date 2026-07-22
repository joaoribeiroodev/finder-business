import { calcularScoreQualidade } from "@/lib/lead-score";
import { normalizarTelefone, telefoneValido } from "@/lib/phone";
import { parsearEndereco } from "@/lib/address";

describe("lead-score", () => {
  it("calcula score máximo para lead ideal", () => {
    const score = calcularScoreQualidade({
      temSite: false,
      avaliacao: 4.5,
      totalReviews: 20,
      telefone: "71999999999",
      endereco: "Av. ACM, 1000 - Brotas, Salvador - BA",
      cidade: "Salvador",
      horarioFunc: "Seg-Sex 8h-18h",
    });
    expect(score).toBe(100);
  });
});

describe("phone", () => {
  it("normaliza telefone BR com DDI", () => {
    expect(normalizarTelefone("(71) 99999-9999")).toBe("5571999999999");
  });

  it("valida telefone mínimo", () => {
    expect(telefoneValido("71999999999")).toBe(true);
    expect(telefoneValido("123")).toBe(false);
  });
});

describe("address", () => {
  it("extrai cidade e CEP", () => {
    const r = parsearEndereco("Av. ACM, Brotas, Salvador - BA, 41100-140");
    expect(r.cep).toBe("41100140");
    expect(r.cidade).toBe("Salvador");
  });
});
