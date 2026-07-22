#!/bin/sh
set -e

echo ">> Sincronizando o schema do banco de dados com db push..."
node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss

echo ">> Iniciando Finder Business na porta ${PORT:-3000}..."
exec node server.js
