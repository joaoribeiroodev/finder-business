import { chromium, type Browser, type Page } from "playwright";
import { prisma } from "./prisma";
import { getEnv } from "./env";
import { normalizarTelefone, telefoneValido } from "./phone";
import { parsearEndereco } from "./address";
import { calcularScoreQualidade } from "./lead-score";

export interface LeadRaspadoRaw {
  nomeEmpresa: string;
  nicho: string;
  telefone: string;
  endereco?: string;
  cidade?: string;
  bairro?: string;
  cep?: string;
  temSite: boolean;
  urlSite?: string;
  googlePlaceId?: string;
  urlMaps?: string;
  avaliacao?: number;
  totalReviews?: number;
  horarioFunc?: string;
  abertoAgora?: boolean;
  nivelPreco?: string;
  instagram?: string;
  facebook?: string;
  scoreQualidade: number;
  termoBusca: string;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

function getChromiumArgs(): string[] {
  const args = [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
  ];
  if (process.env.PLAYWRIGHT_CHROMIUM_SANDBOX === "0") {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  return args;
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true, args: getChromiumArgs() });
}

async function dispensarConsentimento(page: Page): Promise<void> {
  const seletores = [
    'button:has-text("Aceitar tudo")',
    'button:has-text("Accept all")',
    'button:has-text("Rejeitar tudo")',
    'button[aria-label*="Aceitar"]',
  ];
  for (const seletor of seletores) {
    const botao = page.locator(seletor).first();
    if (await botao.isVisible({ timeout: 2000 }).catch(() => false)) {
      await botao.click().catch(() => null);
      await page.waitForTimeout(1000);
      return;
    }
  }
}

async function aguardarResultados(page: Page): Promise<boolean> {
  for (const seletor of ['[role="feed"]', 'a[href*="/maps/place/"]']) {
    if (await page.waitForSelector(seletor, { timeout: 20000 }).catch(() => null)) {
      return true;
    }
  }
  return false;
}

async function rolarFeed(page: Page): Promise<void> {
  const feed = page.locator('[role="feed"]');
  for (let i = 0; i < 8; i++) {
    await feed.evaluate((el) => el.scrollBy(0, 1200)).catch(() => null);
    await page.waitForTimeout(1000);
  }
}

async function coletarUrlsPlace(page: Page): Promise<string[]> {
  const seletores = [
    '[role="feed"] a[href*="/maps/place/"]',
    'a.hfpxzc[href*="/maps/place/"]',
    'div.Nv2PK a[href*="/maps/place/"]',
  ];
  const urls = new Set<string>();
  for (const seletor of seletores) {
    for (const link of await page.locator(seletor).all()) {
      const href = await link.getAttribute("href").catch(() => null);
      if (!href?.includes("/maps/place/")) continue;
      const url = href.startsWith("http")
        ? href
        : `https://www.google.com${href.startsWith("/") ? href : `/${href}`}`;
      urls.add(url.split("?")[0]);
    }
  }
  return Array.from(urls);
}

function extrairPlaceIdDaUrl(url: string): string | undefined {
  const match = url.match(/!1s([^!]+)/) ?? url.match(/place_id=([^&]+)/);
  return match?.[1];
}

async function extrairTexto(page: Page, seletores: string[]): Promise<string | null> {
  for (const seletor of seletores) {
    const locator = page.locator(seletor).first();
    if ((await locator.count()) > 0) {
      const texto = await locator.textContent().catch(() => null);
      if (texto?.trim()) return texto.trim();
    }
  }
  return null;
}

async function extrairDadosPlace(
  page: Page,
  url: string,
  termo: string
): Promise<{ lead: LeadRaspadoRaw | null; motivo?: string }> {
  console.log(`[Scraper] [extrairDadosPlace] Iniciando extração de dados.`);
  await page.waitForTimeout(1500);

  console.log(`[Scraper] [extrairDadosPlace] Obtendo nome...`);
  const nome = await extrairTexto(page, [
    'h1[class*="DUwDvf"]',
    "h1.DUwDvf",
    '[role="main"] h1',
  ]);
  console.log(`[Scraper] [extrairDadosPlace] Nome: "${nome}"`);

  console.log(`[Scraper] [extrairDadosPlace] Obtendo telefone...`);
  const telefoneRaw = await extrairTexto(page, [
    '[data-tooltip="Copiar número de telefone"]',
    'button[data-item-id^="phone"]',
    'button[aria-label*="telefone"]',
  ]);
  console.log(`[Scraper] [extrairDadosPlace] Telefone raw: "${telefoneRaw}"`);

  console.log(`[Scraper] [extrairDadosPlace] Obtendo endereço...`);
  const endereco = await extrairTexto(page, [
    '[data-tooltip="Copiar endereço"]',
    'button[data-item-id="address"]',
  ]);
  console.log(`[Scraper] [extrairDadosPlace] Endereço: "${endereco}"`);

  console.log(`[Scraper] [extrairDadosPlace] Obtendo site...`);
  const siteEl = page.locator(
    '[data-tooltip="Abrir site"], button[data-item-id="authority"], a[data-item-id="authority"]'
  );
  const temSiteListado = (await siteEl.count()) > 0;
  const urlSite =
    temSiteListado
      ? await siteEl.first().getAttribute("href").catch(() => null) ?? undefined
      : undefined;
  console.log(`[Scraper] [extrairDadosPlace] Tem site listado: ${temSiteListado}, URL: "${urlSite}"`);

  if (temSiteListado) {
    return { lead: null, motivo: "TEM_SITE" };
  }

  if (!nome) return { lead: null, motivo: "ERRO_EXTRACAO" };

  const telefone = telefoneRaw ? normalizarTelefone(telefoneRaw) : "";
  if (!telefoneValido(telefone)) {
    console.log(`[Scraper] [extrairDadosPlace] Telefone inválido/ausente: "${telefone}"`);
    return { lead: null, motivo: "SEM_TELEFONE" };
  }

  console.log(`[Scraper] [extrairDadosPlace] Telefone válido: "${telefone}"`);
  const nicho =
    (await extrairTexto(page, [
      'button[jsaction*="category"]',
      'button[aria-label*="Categoria"]',
    ])) ?? termo;

  const avaliacaoTexto = await extrairTexto(page, [
    'div.F7nice span[aria-hidden="true"]',
    'span.ceNzKf',
  ]);
  const avaliacao = avaliacaoTexto
    ? parseFloat(avaliacaoTexto.replace(",", "."))
    : undefined;

  const reviewsEl = page
    .locator('div.F7nice span[aria-label*="avalia"], div.F7nice span[aria-label*="review"]')
    .first();
  const reviewsTexto = (await reviewsEl.count()) > 0
    ? await reviewsEl.getAttribute("aria-label").catch(() => null)
    : null;
  const totalReviews = reviewsTexto
    ? parseInt(reviewsTexto.replace(/\D/g, ""), 10) || undefined
    : undefined;

  const horarioFunc = await extrairTexto(page, [
    'div[aria-label*="Horário"]',
    'button[data-item-id="oh"]',
  ]);

  const abertoEl = page.locator("text=/Aberto|Fechado|Open|Closed/").first();
  const abertoTexto = (await abertoEl.count()) > 0
    ? await abertoEl.textContent().catch(() => null)
    : null;
  const abertoAgora = abertoTexto
    ? /aberto|open/i.test(abertoTexto) && !/fechado|closed/i.test(abertoTexto)
    : undefined;

  const { cidade, bairro, cep } = parsearEndereco(endereco);

  const instagramEl = page.locator('a[href*="instagram.com"]').first();
  const instagram = (await instagramEl.count()) > 0
    ? await instagramEl.getAttribute("href").catch(() => null)
    : null;

  const facebookEl = page.locator('a[href*="facebook.com"]').first();
  const facebook = (await facebookEl.count()) > 0
    ? await facebookEl.getAttribute("href").catch(() => null)
    : null;

  const leadBase = {
    nomeEmpresa: nome,
    nicho,
    telefone,
    endereco: endereco ?? undefined,
    cidade,
    bairro,
    cep,
    temSite: false,
    urlSite,
    googlePlaceId: extrairPlaceIdDaUrl(url),
    urlMaps: url,
    avaliacao: Number.isFinite(avaliacao) ? avaliacao : undefined,
    totalReviews,
    horarioFunc: horarioFunc ?? undefined,
    abertoAgora,
    instagram: instagram ?? undefined,
    facebook: facebook ?? undefined,
    termoBusca: termo,
  };

  const scoreQualidade = calcularScoreQualidade({
    temSite: false,
    avaliacao: leadBase.avaliacao,
    totalReviews: leadBase.totalReviews,
    telefone,
    endereco,
    cidade,
    horarioFunc,
  });

  return {
    lead: { ...leadBase, scoreQualidade },
  };
}

async function visitarComRetry(
  page: Page,
  url: string,
  termo: string,
  tentativas = 2
): Promise<{ lead: LeadRaspadoRaw | null; motivo?: string }> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const timeout = getEnv().SCRAPER_TIMEOUT_MS;
      console.log(`[Scraper] [visitarComRetry] Navegando para ${url} (Tentativa ${i+1}/${tentativas}), timeout ${timeout}ms...`);
      const start = Date.now();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      console.log(`[Scraper] [visitarComRetry] Navegação concluída em ${((Date.now() - start)/1000).toFixed(1)}s`);
      return await extrairDadosPlace(page, url, termo);
    } catch (e) {
      console.error(`[Scraper] [visitarComRetry] Erro na tentativa ${i+1}:`, e);
      if (i < tentativas - 1) await page.waitForTimeout(2000 * (i + 1));
    }
  }
  return { lead: null, motivo: "ERRO_EXTRACAO" };
}

export async function executarScraping(jobId: string, termo: string): Promise<number> {
  const env = getEnv();
  const maxPlaces = env.SCRAPER_MAX_PLACES;

  await prisma.scrapeJob.update({
    where: { id: jobId },
    data: { status: "RODANDO" },
  });

  console.log(`[Scraper] Job ${jobId} — busca: "${termo}"`);

  const browser = await launchBrowser();
  let totalInseridos = 0;
  let totalDescartados = 0;

  try {
    const context = await browser.newContext({
      locale: "pt-BR",
      viewport: DEFAULT_VIEWPORT,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(env.SCRAPER_TIMEOUT_MS);

    const urlBusca = `https://www.google.com/maps/search/${encodeURIComponent(termo)}`;
    await page.goto(urlBusca, { waitUntil: "domcontentloaded", timeout: env.SCRAPER_TIMEOUT_MS });
    await page.waitForTimeout(2000);
    await dispensarConsentimento(page);

    if (!(await aguardarResultados(page))) {
      throw new Error("Não foi possível carregar resultados do Google Maps.");
    }

    await rolarFeed(page);
    const urlsPlace = await coletarUrlsPlace(page);
    const leadsColetados: LeadRaspadoRaw[] = [];

    console.log(`[Scraper] ${urlsPlace.length} estabelecimento(s) encontrado(s)`);

    for (const url of urlsPlace.slice(0, maxPlaces)) {
      const { lead, motivo } = await visitarComRetry(page, url, termo);

      if (lead) {
        leadsColetados.push(lead);
      } else if (motivo) {
        totalDescartados += 1;
        await prisma.leadDescartado.create({
          data: {
            nomeEmpresa: null,
            urlMaps: url,
            motivo,
            termoBusca: termo,
            scrapeJobId: jobId,
          },
        }).catch(() => null);
      }
    }

    for (const lead of leadsColetados) {
      try {
        await prisma.lead.upsert({
          where: { telefone: lead.telefone },
          create: {
            ...lead,
            scrapeJobId: jobId,
          },
          update: {
            nomeEmpresa: lead.nomeEmpresa,
            nicho: lead.nicho,
            endereco: lead.endereco,
            cidade: lead.cidade,
            bairro: lead.bairro,
            cep: lead.cep,
            urlMaps: lead.urlMaps,
            googlePlaceId: lead.googlePlaceId,
            avaliacao: lead.avaliacao,
            totalReviews: lead.totalReviews,
            horarioFunc: lead.horarioFunc,
            abertoAgora: lead.abertoAgora,
            instagram: lead.instagram,
            facebook: lead.facebook,
            scoreQualidade: lead.scoreQualidade,
            termoBusca: lead.termoBusca,
            scrapeJobId: jobId,
          },
        });
        totalInseridos += 1;
      } catch {
        totalDescartados += 1;
        await prisma.leadDescartado.create({
          data: {
            nomeEmpresa: lead.nomeEmpresa,
            telefone: lead.telefone,
            urlMaps: lead.urlMaps,
            motivo: "DUPLICADO",
            termoBusca: termo,
            scrapeJobId: jobId,
          },
        }).catch(() => null);
      }
    }

    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "CONCLUIDO",
        totalEncontrados: urlsPlace.length,
        totalInseridos,
        totalDescartados,
        finalizadoEm: new Date(),
      },
    });

    console.log(`[Scraper] Job ${jobId} concluído — ${totalInseridos} inserido(s)`);
    return totalInseridos;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "ERRO",
        erro: msg,
        finalizadoEm: new Date(),
      },
    });
    throw error;
  } finally {
    await browser.close();
  }
}
