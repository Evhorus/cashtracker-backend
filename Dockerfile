# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# CashTracker Backend — production image
#
# Multi-stage build so the runtime image never contains devDependencies,
# TypeScript sources, the pnpm store, or build tooling — only the compiled
# `dist/` output and production node_modules.
#
# Node version is pinned to an exact patch (not a floating major/minor tag)
# so a base-image rebuild upstream can never silently change the Node
# version this app runs on in prod. Bump NODE_VERSION deliberately.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=22.23.2
ARG PNPM_VERSION=10.34.5

# ---- base: shared setup, no source yet ------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:${PATH}"
# Corepack ships with Node but its shipped pnpm shim is just a launcher;
# pin the actual pnpm version explicitly so installs are reproducible.
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---- deps: full dependency graph, needed to compile TypeScript ------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=cashtracker-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: compile TypeScript -> dist -------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm run build

# ---- deps-prod: production-only dependency graph (small, no devDeps) ------
FROM base AS deps-prod
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=cashtracker-pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ---- runtime: minimal final image ------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini becomes PID 1: forwards SIGTERM/SIGINT correctly and reaps zombies,
# so `docker stop` / orchestrator shutdowns terminate the app cleanly
# instead of being ignored by Node running as PID 1 directly.
#
# The base Node image also bundles npm/npx/corepack (and npm's own vendored
# deps: tar, sigstore, ip-address, picomatch, ...) purely as CLI tooling.
# The app is started with `node dist/main.js` directly and never shells out
# to any of them at runtime, so they're stripped here - this is the single
# biggest source of CVEs an SCA scan turns up on this image (verified with
# `docker scout cves`) and ~17MB of dead weight.
RUN apk add --no-cache tini \
    && addgroup -S nodeapp \
    && adduser -S nodeapp -G nodeapp \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY --chown=nodeapp:nodeapp package.json ./
COPY --from=deps-prod --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=build      --chown=nodeapp:nodeapp /app/dist ./dist

USER nodeapp
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||4000,path:'/api/health-check',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
