# Build context must be the monorepo root, e.g.:
#   docker build -f apps/web/Dockerfile -t web .
# (docker-compose.yml at the repo root is already wired for this)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

# 1. Prune the monorepo down to just what `web` needs.
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# 2. Install deps (cached on the lockfile) and build the app.
FROM base AS installer
WORKDIR /app
# NEXT_PUBLIC_* are inlined into the client bundle at build time — must be present here.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=web

# 3. Minimal runtime image built from the standalone output.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone folder already contains apps/web/server.js + a traced node_modules.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# static/ and public/ are NOT part of standalone — copy them explicitly.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
