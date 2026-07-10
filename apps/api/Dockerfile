# Squelette minimal pour permettre `docker compose up` dès la Phase 3.
# Build multi-stage complet, optimisation de taille d'image et
# healthcheck détaillés en Phase 20 — ne pas complexifier ici avant
# d'en avoir besoin.

FROM node:20-alpine

WORKDIR /app
COPY package.json pnpm-workckspace.yaml ./
COPY  apps/api ./apps/api
COPY package ./packages
RUN corepack enable && pnpm install --frozen-lockfile
WORKDIR /app/apps/api
RUN pnpm build 
Expose 4000 
CMD ["pnpm","start"]

