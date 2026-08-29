# apps/executor/Dockerfile
#
# Repose sur l'image officielle Playwright, qui embarque déjà Chromium
# et toutes ses dépendances système — évite des heures de debug de
# libs manquantes en environnement conteneurisé. Détail complet du
# multi-stage et de la taille d'image en Phase 20.

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/executor ./apps/executor
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile

WORKDIR /app/apps/executor
RUN pnpm build

CMD ["node", "dist/examples/capture-homepage.js"]
