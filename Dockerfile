# syntax=docker/dockerfile:1

# ── Dependências ──────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ── Produção (imagem oficial do Playwright com Chromium) ──────────────────────
FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_CHROMIUM_SANDBOX=0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/playwright ./node_modules/playwright
COPY --from=builder /app/node_modules/playwright-core ./node_modules/playwright-core
COPY --from=builder /app/node_modules/exceljs ./node_modules/exceljs
COPY --from=builder /app/node_modules/archiver ./node_modules/archiver
COPY --from=builder /app/node_modules/dayjs ./node_modules/dayjs
COPY --from=builder /app/node_modules/fast-csv ./node_modules/fast-csv
COPY --from=builder /app/node_modules/jszip ./node_modules/jszip
COPY --from=builder /app/node_modules/readable-stream ./node_modules/readable-stream
COPY --from=builder /app/node_modules/saxes ./node_modules/saxes
COPY --from=builder /app/node_modules/tmp ./node_modules/tmp
COPY --from=builder /app/node_modules/unzipper ./node_modules/unzipper
COPY --from=builder /app/node_modules/uuid ./node_modules/uuid

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
