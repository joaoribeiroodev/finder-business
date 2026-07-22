/** Normaliza telefone para armazenamento (apenas dígitos, com DDI 55 se BR). */
export function normalizarTelefone(tel: string): string {
  const digitos = tel.replace(/\D/g, "");
  if (digitos.length === 0) return tel.trim();
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  if (digitos.length >= 10 && digitos.length <= 11) return `55${digitos}`;
  return digitos;
}

/** Formata para link wa.me */
export function telefoneParaWhatsApp(tel: string): string {
  return normalizarTelefone(tel);
}

/** Valida se tem quantidade mínima de dígitos */
export function telefoneValido(tel: string): boolean {
  const digitos = tel.replace(/\D/g, "");
  return digitos.length >= 10;
}

/** Exibe formatado: (71) 99999-9999 */
export function formatarTelefoneExibicao(tel: string): string {
  const d = normalizarTelefone(tel).replace(/^55/, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return tel;
}
