import ExcelJS from "exceljs";
import type { Lead, LeadStatus } from "@prisma/client";
import type { LeadQuery } from "./validations";
import { formatarTelefoneExibicao } from "./phone";

const STATUS_LABEL: Record<LeadStatus, string> = {
  PENDENTE: "Pendente",
  PROCESSANDO_IA: "Processando IA",
  MENSAGEM_GERADA: "Mensagem gerada",
  CONTATADO: "Contatado",
  SEM_INTERESSE: "Sem interesse",
  REUNIAO_AGENDADA: "Reunião agendada",
};

const CORES = {
  header: "FF1E3A5F",
  headerFont: "FFFFFFFF",
  titulo: "FF2563EB",
  linhaPar: "FFF8FAFC",
  linhaImpar: "FFFFFFFF",
  scoreAlto: "FFDCFCE7",
  scoreMedio: "FFFEF9C3",
  scoreBaixo: "FFFEE2E2",
  borda: "FFE2E8F0",
};

interface ExportOptions {
  leads: Lead[];
  filtros: Partial<LeadQuery>;
}

function formatarData(d: Date): string {
  return d.toLocaleString("pt-BR");
}

function descricaoFiltros(filtros: Partial<LeadQuery>): string[] {
  const linhas: string[] = [];
  if (filtros.q) linhas.push(`Busca: "${filtros.q}"`);
  if (filtros.status) linhas.push(`Status: ${STATUS_LABEL[filtros.status]}`);
  if (filtros.cidade) linhas.push(`Cidade: ${filtros.cidade}`);
  if (filtros.nicho) linhas.push(`Nicho: ${filtros.nicho}`);
  if (filtros.scoreMin != null) linhas.push(`Score mínimo: ${filtros.scoreMin}`);
  if (linhas.length === 0) linhas.push("Nenhum filtro aplicado (todos os leads)");
  return linhas;
}

function corScore(score: number | null | undefined): string {
  if (score == null) return CORES.linhaImpar;
  if (score >= 70) return CORES.scoreAlto;
  if (score >= 40) return CORES.scoreMedio;
  return CORES.scoreBaixo;
}

export async function gerarRelatorioXlsx({ leads, filtros }: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finder Business";
  workbook.created = new Date();

  // ── Aba Resumo ─────────────────────────────────────────────────────────────
  const resumo = workbook.addWorksheet("Resumo", {
    views: [{ showGridLines: false }],
  });
  resumo.columns = [{ width: 28 }, { width: 50 }];

  resumo.mergeCells("A1:B1");
  const titulo = resumo.getCell("A1");
  titulo.value = "Finder Business — Relatório de Leads";
  titulo.font = { size: 18, bold: true, color: { argb: CORES.titulo } };
  titulo.alignment = { vertical: "middle" };

  const infoRows: [string, string | number][] = [
    ["Exportado em", formatarData(new Date())],
    ["Total de leads", leads.length],
    ["Score médio", leads.length ? Math.round(leads.reduce((s, l) => s + (l.scoreQualidade ?? 0), 0) / leads.length) : 0],
    ["Com mensagem IA", leads.filter((l) => l.mensagemIA).length],
    ["Contatados", leads.filter((l) => l.status === "CONTATADO").length],
    ["Alta qualidade (≥70)", leads.filter((l) => (l.scoreQualidade ?? 0) >= 70).length],
    ["", ""],
    ["Filtros aplicados", ""],
    ...descricaoFiltros(filtros).map((f) => ["", f] as [string, string]),
    ["", ""],
    ["Legenda — Score de qualidade", ""],
    ["70–100", "Lead prioritário — alto potencial de conversão"],
    ["40–69", "Lead médio — vale abordar com critério"],
    ["0–39", "Lead fraco — dados insuficientes ou perfil menos ideal"],
    ["", ""],
    ["Legenda — Status", ""],
    ...Object.entries(STATUS_LABEL).map(([k, v]) => [k, v] as [string, string]),
  ];

  let row = 3;
  for (const [label, value] of infoRows) {
    const r = resumo.getRow(row);
    r.getCell(1).value = label;
    r.getCell(2).value = value;
    r.getCell(1).font = { bold: label !== "" && !label.startsWith("Legenda") && value === "" ? true : false, color: { argb: "FF64748B" } };
    r.getCell(2).font = { color: { argb: "FF1E293B" } };
    row++;
  }

  // ── Aba Estatísticas (dados para gráficos) ─────────────────────────────────
  const stats = workbook.addWorksheet("Estatísticas");

  const porStatus = Object.keys(STATUS_LABEL).map((status) => ({
    status: STATUS_LABEL[status as LeadStatus],
    count: leads.filter((l) => l.status === status).length,
  })).filter((s) => s.count > 0);

  stats.getCell("A1").value = "Status";
  stats.getCell("B1").value = "Quantidade";
  porStatus.forEach((s, i) => {
    stats.getRow(i + 2).values = [s.status, s.count];
  });

  const cidadeMap = new Map<string, number>();
  for (const l of leads) {
    const c = l.cidade ?? "Não informada";
    cidadeMap.set(c, (cidadeMap.get(c) ?? 0) + 1);
  }
  const porCidade = Array.from(cidadeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  stats.getCell("D1").value = "Cidade";
  stats.getCell("E1").value = "Quantidade";
  porCidade.forEach(([cidade, count], i) => {
    stats.getRow(i + 2).getCell(4).value = cidade;
    stats.getRow(i + 2).getCell(5).value = count;
  });

  const faixasScore = [
    { faixa: "Alto (70+)", count: leads.filter((l) => (l.scoreQualidade ?? 0) >= 70).length },
    { faixa: "Médio (40-69)", count: leads.filter((l) => (l.scoreQualidade ?? 0) >= 40 && (l.scoreQualidade ?? 0) < 70).length },
    { faixa: "Baixo (<40)", count: leads.filter((l) => (l.scoreQualidade ?? 0) < 40).length },
  ];

  stats.getCell("G1").value = "Faixa score";
  stats.getCell("H1").value = "Quantidade";
  faixasScore.forEach((f, i) => {
    stats.getRow(i + 2).getCell(7).value = f.faixa;
    stats.getRow(i + 2).getCell(8).value = f.count;
  });

  for (const col of ["A1", "B1", "D1", "E1", "G1", "H1"]) {
    const cell = stats.getCell(col);
    cell.font = { bold: true, color: { argb: CORES.headerFont } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.header } };
  }

  stats.getColumn("A").width = 22;
  stats.getColumn("B").width = 14;
  stats.getColumn("D").width = 22;
  stats.getColumn("E").width = 14;
  stats.getColumn("G").width = 18;
  stats.getColumn("H").width = 14;

  // Barras visuais com caracteres na aba Estatísticas
  const maxStatus = Math.max(...porStatus.map((s) => s.count), 1);
  porStatus.forEach((s, i) => {
    const barLen = Math.round((s.count / maxStatus) * 20);
    stats.getRow(i + 2).getCell(3).value = "█".repeat(barLen);
    stats.getRow(i + 2).getCell(3).font = { color: { argb: "FF3B82F6" } };
  });

  const maxCidade = Math.max(...porCidade.map(([, c]) => c), 1);
  porCidade.forEach(([, count], i) => {
    const barLen = Math.round((count / maxCidade) * 20);
    stats.getRow(i + 2).getCell(6).value = "█".repeat(barLen);
    stats.getRow(i + 2).getCell(6).font = { color: { argb: "FF10B981" } };
  });

  const maxFaixa = Math.max(...faixasScore.map((f) => f.count), 1);
  faixasScore.forEach((f, i) => {
    const barLen = Math.round((f.count / maxFaixa) * 20);
    stats.getRow(i + 2).getCell(9).value = "█".repeat(barLen);
    stats.getRow(i + 2).getCell(9).font = { color: { argb: "FF8B5CF6" } };
  });

  stats.getCell("C1").value = "Gráfico";
  stats.getCell("F1").value = "Gráfico";
  stats.getCell("I1").value = "Gráfico";
  for (const col of ["C1", "F1", "I1"]) {
    const cell = stats.getCell(col);
    cell.font = { bold: true, italic: true, color: { argb: "FF64748B" } };
  }

  // Mini dashboard visual na aba Resumo (tabelas estilizadas)
  const dashRow = row + 2;
  resumo.mergeCells(`A${dashRow}:B${dashRow}`);
  resumo.getCell(`A${dashRow}`).value = "Resumo visual";
  resumo.getCell(`A${dashRow}`).font = { size: 14, bold: true, color: { argb: CORES.titulo } };

  let dr = dashRow + 2;
  resumo.getCell(`A${dr}`).value = "Por status";
  resumo.getCell(`A${dr}`).font = { bold: true };
  dr++;
  for (const s of porStatus) {
    resumo.getCell(`A${dr}`).value = s.status;
    resumo.getCell(`B${dr}`).value = s.count;
    resumo.getCell(`B${dr}`).alignment = { horizontal: "right" };
    dr++;
  }

  dr += 1;
  resumo.getCell(`A${dr}`).value = "Top cidades";
  resumo.getCell(`A${dr}`).font = { bold: true };
  dr++;
  for (const [cidade, count] of porCidade.slice(0, 5)) {
    resumo.getCell(`A${dr}`).value = cidade;
    resumo.getCell(`B${dr}`).value = count;
    resumo.getCell(`B${dr}`).alignment = { horizontal: "right" };
    dr++;
  }

  // ── Aba Leads ────────────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });

  const colunas: { header: string; key: string; width: number }[] = [
    { header: "Empresa", key: "nomeEmpresa", width: 28 },
    { header: "Nicho", key: "nicho", width: 20 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Cidade", key: "cidade", width: 16 },
    { header: "Bairro", key: "bairro", width: 16 },
    { header: "Endereço", key: "endereco", width: 36 },
    { header: "Score", key: "scoreQualidade", width: 8 },
    { header: "Avaliação", key: "avaliacao", width: 10 },
    { header: "Reviews", key: "totalReviews", width: 10 },
    { header: "Status", key: "status", width: 16 },
    { header: "Aberto agora", key: "abertoAgora", width: 12 },
    { header: "Horário", key: "horarioFunc", width: 24 },
    { header: "Termo busca", key: "termoBusca", width: 22 },
    { header: "Google Maps", key: "urlMaps", width: 14 },
    { header: "Mensagem IA", key: "mensagemIA", width: 40 },
    { header: "Observações", key: "observacoes", width: 24 },
    { header: "Criado em", key: "createdAt", width: 18 },
  ];

  sheet.columns = colunas;

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: CORES.headerFont } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.header } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: CORES.borda } },
    };
  });

  leads.forEach((lead, idx) => {
    const row = sheet.addRow({
      nomeEmpresa: lead.nomeEmpresa,
      nicho: lead.nicho,
      telefone: formatarTelefoneExibicao(lead.telefone),
      cidade: lead.cidade ?? "",
      bairro: lead.bairro ?? "",
      endereco: lead.endereco ?? "",
      scoreQualidade: lead.scoreQualidade ?? "",
      avaliacao: lead.avaliacao ?? "",
      totalReviews: lead.totalReviews ?? "",
      status: STATUS_LABEL[lead.status],
      abertoAgora: lead.abertoAgora == null ? "" : lead.abertoAgora ? "Sim" : "Não",
      horarioFunc: lead.horarioFunc ?? "",
      termoBusca: lead.termoBusca ?? "",
      urlMaps: lead.urlMaps ? "Abrir" : "",
      mensagemIA: lead.mensagemIA ?? "",
      observacoes: lead.observacoes ?? "",
      createdAt: formatarData(lead.createdAt),
    });

    const bg = corScore(lead.scoreQualidade);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = {
        top: { style: "thin", color: { argb: CORES.borda } },
        left: { style: "thin", color: { argb: CORES.borda } },
        bottom: { style: "thin", color: { argb: CORES.borda } },
        right: { style: "thin", color: { argb: CORES.borda } },
      };
      cell.alignment = { vertical: "top", wrapText: colNumber >= 14 };

      if (colNumber === 7 && typeof lead.scoreQualidade === "number") {
        cell.font = {
          bold: true,
          color: {
            argb: lead.scoreQualidade >= 70 ? "FF166534" : lead.scoreQualidade >= 40 ? "FF854D0E" : "FF991B1B",
          },
        };
      }
    });

    if (lead.urlMaps) {
      const mapsCell = row.getCell("urlMaps");
      mapsCell.value = { text: "Abrir no Maps", hyperlink: lead.urlMaps };
      mapsCell.font = { color: { argb: "FF2563EB" }, underline: true };
    }
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(leads.length, 1), column: colunas.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Planilha simples com os leads encontrados — uma aba, pronta para prospecção. */
export async function gerarPlanilhaLeadsXlsx(leads: Lead[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finder Business";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
  });

  const colunas: { header: string; key: string; width: number }[] = [
    { header: "Empresa", key: "nomeEmpresa", width: 30 },
    { header: "Telefone", key: "telefone", width: 18 },
    { header: "Nicho", key: "nicho", width: 22 },
    { header: "Cidade", key: "cidade", width: 18 },
    { header: "Bairro", key: "bairro", width: 18 },
    { header: "Endereço", key: "endereco", width: 38 },
    { header: "CEP", key: "cep", width: 12 },
    { header: "Tem site", key: "temSite", width: 10 },
    { header: "Website", key: "urlSite", width: 28 },
    { header: "Avaliação", key: "avaliacao", width: 10 },
    { header: "Nº avaliações", key: "totalReviews", width: 14 },
    { header: "Score", key: "scoreQualidade", width: 8 },
    { header: "Aberto agora", key: "abertoAgora", width: 12 },
    { header: "Horário", key: "horarioFunc", width: 26 },
    { header: "E-mail", key: "email", width: 26 },
    { header: "Instagram", key: "instagram", width: 22 },
    { header: "Facebook", key: "facebook", width: 22 },
    { header: "Google Maps", key: "urlMaps", width: 16 },
    { header: "Termo da busca", key: "termoBusca", width: 24 },
    { header: "Mensagem IA", key: "mensagemIA", width: 44 },
    { header: "Status", key: "status", width: 16 },
    { header: "Capturado em", key: "createdAt", width: 18 },
  ];

  sheet.columns = colunas;

  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: CORES.headerFont } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CORES.header } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: CORES.borda } } };
  });

  for (const lead of leads) {
    const row = sheet.addRow({
      nomeEmpresa: lead.nomeEmpresa,
      telefone: formatarTelefoneExibicao(lead.telefone),
      nicho: lead.nicho,
      cidade: lead.cidade ?? "",
      bairro: lead.bairro ?? "",
      endereco: lead.endereco ?? "",
      cep: lead.cep ?? "",
      temSite: lead.temSite ? "Sim" : "Não",
      urlSite: lead.urlSite ?? "",
      avaliacao: lead.avaliacao ?? "",
      totalReviews: lead.totalReviews ?? "",
      scoreQualidade: lead.scoreQualidade ?? "",
      abertoAgora: lead.abertoAgora == null ? "" : lead.abertoAgora ? "Sim" : "Não",
      horarioFunc: lead.horarioFunc ?? "",
      email: lead.email ?? "",
      instagram: lead.instagram ?? "",
      facebook: lead.facebook ?? "",
      urlMaps: lead.urlMaps ?? "",
      termoBusca: lead.termoBusca ?? "",
      mensagemIA: lead.mensagemIA ?? "",
      status: STATUS_LABEL[lead.status],
      createdAt: formatarData(lead.createdAt),
    });

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.alignment = {
        vertical: "top",
        wrapText: colNumber === 20 || colNumber === 6,
      };
      cell.border = {
        top: { style: "thin", color: { argb: CORES.borda } },
        left: { style: "thin", color: { argb: CORES.borda } },
        bottom: { style: "thin", color: { argb: CORES.borda } },
        right: { style: "thin", color: { argb: CORES.borda } },
      };
    });

    if (lead.urlMaps) {
      const mapsCell = row.getCell("urlMaps");
      mapsCell.value = { text: "Abrir no Maps", hyperlink: lead.urlMaps };
      mapsCell.font = { color: { argb: "FF2563EB" }, underline: true };
    }

    if (lead.urlSite) {
      const siteCell = row.getCell("urlSite");
      siteCell.value = { text: lead.urlSite, hyperlink: lead.urlSite };
      siteCell.font = { color: { argb: "FF2563EB" }, underline: true };
    }
  }

  if (leads.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: leads.length + 1, column: colunas.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** @deprecated Use gerarRelatorioXlsx */
export const gerarExportacaoXlsx = gerarRelatorioXlsx;
