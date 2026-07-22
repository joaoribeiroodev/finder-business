# Finder Business

Sistema de prospeccao B2B que busca empresas no Google Maps, qualifica leads sem site, gera mensagens com IA da OpenAI e gerencia o funil de vendas via WhatsApp.

## Funcionalidades

- Scraping enriquecido do Google Maps
- Rastreamento de buscas com `ScrapeJob`
- Geracao de mensagens com OpenAI
- Geracao em lote de mensagens
- Dashboard analitico com funil e rankings
- Filtros, exportacao CSV/planilha e pagina de detalhe do lead
- Docker Compose com app + PostgreSQL + Playwright

## Requisitos

- Node.js 20+
- PostgreSQL 16 ou Docker
- Chave da [OpenAI API](https://platform.openai.com/)

## Setup local

```bash
copy .env.example .env
# Edite .env com DATABASE_URL e OPENAI_API_KEY

npm install
npx prisma db push
npm run playwright:install
npm run dev
```

Acesse: http://localhost:3000

## Docker

```bash
copy .env.example .env
# Preencha OPENAI_API_KEY e POSTGRES_PASSWORD

docker compose up --build -d
```

## Variaveis de ambiente

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | Conexao PostgreSQL |
| `OPENAI_API_KEY` | API da OpenAI |
| `OPENAI_MODEL` | Modelo usado para gerar mensagens |
| `SCRAPER_MAX_PLACES` | Maximo de estabelecimentos por busca |
| `RATE_LIMIT_SCRAPER` | Maximo de buscas por janela |
| `RATE_LIMIT_OPENAI` | Maximo de geracoes por janela |
| `APP_PASSWORD` | Senha de acesso opcional |
| `APP_PORT` | Porta no host |

## Scripts

| Comando | Acao |
|---------|------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de producao |
| `npm run db:push` | Sincronizar schema |
| `npm run db:migrate:dev` | Criar migration |
| `docker compose up -d` | Subir com Docker |

## Documentacao

Plano completo de implementacao: [docs/PLANO-IMPLEMENTACAO.md](docs/PLANO-IMPLEMENTACAO.md)
