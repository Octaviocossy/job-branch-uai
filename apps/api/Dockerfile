# Build context must be the monorepo root, e.g.:
#   docker build -f apps/api/Dockerfile -t api .
# (docker-compose.yml in this directory is already wired for this)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=api

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nestjs \
  && adduser --system --uid 1001 nestjs
COPY --from=installer --chown=nestjs:nestjs /app .
USER nestjs

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
