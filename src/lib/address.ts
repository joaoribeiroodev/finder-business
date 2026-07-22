export interface EnderecoParseado {
  cidade?: string;
  bairro?: string;
  cep?: string;
}

/** Extrai cidade, bairro e CEP de endereço brasileiro no formato Maps. */
export function parsearEndereco(endereco?: string | null): EnderecoParseado {
  if (!endereco) return {};

  const cepMatch = endereco.match(/\b(\d{5}-?\d{3})\b/);
  const cep = cepMatch?.[1]?.replace("-", "");

  // Padrão: "..., Bairro, Cidade - UF, CEP"
  const partes = endereco.split(",").map((p) => p.trim());
  let cidade: string | undefined;
  let bairro: string | undefined;

  if (partes.length >= 2) {
    const ultima = partes[partes.length - 1];
    const penultima = partes[partes.length - 2];

    if (/^\d{5}/.test(ultima) && partes.length >= 3) {
      const cidadeUf = partes[partes.length - 2];
      const matchCidade = cidadeUf.match(/^(.+?)\s*-\s*[A-Z]{2}$/);
      cidade = matchCidade?.[1]?.trim() ?? cidadeUf;
      if (partes.length >= 4) bairro = partes[partes.length - 3];
    } else {
      const matchCidade = penultima.match(/^(.+?)\s*-\s*[A-Z]{2}$/);
      if (matchCidade) {
        cidade = matchCidade[1].trim();
        if (partes.length >= 3) bairro = partes[partes.length - 3];
      }
    }
  }

  return { cidade, bairro, cep };
}
