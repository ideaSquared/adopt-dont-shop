# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE STAGE
# ============================================================================
FROM node:24-alpine AS base

RUN apk update && apk upgrade && apk add --no-cache \
    curl=~8 \
    netcat-openbsd=~1 \
    dumb-init=~1 \
    && rm -rf /var/cache/apk/*

WORKDIR /app
ENV HUSKY=0

# ============================================================================
# DEPENDENCIES STAGE
# ============================================================================
FROM base AS dependencies

COPY package.json package-lock.json ./
COPY eslint-config-base/ eslint-config-base/
COPY eslint-config-node/ eslint-config-node/
COPY lib.example/ lib.example/
COPY service.api/package*.json service.api/

WORKDIR /app/service.api
RUN --mount=type=cache,target=/root/.npm \
    HUSKY=0 npm ci --omit=dev --prefer-offline && \
    npm cache clean --force

# ============================================================================
# DEVELOPMENT STAGE
# ============================================================================
FROM base AS development

COPY package.json package-lock.json ./
COPY eslint-config-base/ eslint-config-base/
COPY eslint-config-node/ eslint-config-node/
COPY lib.example/ lib.example/
COPY service.api/ service.api/

RUN chmod +x /app/service.api/docker-entrypoint.sh

WORKDIR /app/lib.example
RUN --mount=type=cache,target=/root/.npm \
    HUSKY=0 npm ci --prefer-offline && npm run build

WORKDIR /app/service.api
RUN --mount=type=cache,target=/root/.npm \
    HUSKY=0 npm ci --prefer-offline

RUN rm -rf node_modules/@my-org/lib.example && \
    mkdir -p node_modules/@my-org/lib.example && \
    cp /app/lib.example/package.json node_modules/@my-org/lib.example/ && \
    cp -r /app/lib.example/dist node_modules/@my-org/lib.example/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    mkdir -p /app/service.api/uploads && \
    chown -R appuser:nodejs /app/service.api /app/lib.example

USER appuser
EXPOSE 5000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "dev"]

# ============================================================================
# BUILD STAGE
# ============================================================================
FROM base AS build

COPY package.json package-lock.json ./
COPY eslint-config-base/ eslint-config-base/
COPY eslint-config-node/ eslint-config-node/
COPY lib.example/ lib.example/
COPY service.api/ service.api/

RUN chmod +x /app/service.api/docker-entrypoint.sh

WORKDIR /app/lib.example
RUN --mount=type=cache,target=/root/.npm \
    HUSKY=0 npm ci --prefer-offline && npm run build

WORKDIR /app/service.api
RUN --mount=type=cache,target=/root/.npm \
    HUSKY=0 npm ci --prefer-offline

RUN rm -rf node_modules/@my-org/lib.example && \
    mkdir -p node_modules/@my-org/lib.example && \
    cp /app/lib.example/package.json node_modules/@my-org/lib.example/ && \
    cp -r /app/lib.example/dist node_modules/@my-org/lib.example/

RUN NODE_ENV=production npm run build && \
    npm prune --omit=dev

RUN rm -rf node_modules/@my-org/lib.example && \
    mkdir -p node_modules/@my-org/lib.example && \
    cp /app/lib.example/package.json node_modules/@my-org/lib.example/ && \
    cp -r /app/lib.example/dist node_modules/@my-org/lib.example/

# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM node:24-alpine AS production

RUN apk update && apk upgrade && apk add --no-cache \
    curl=~8 \
    dumb-init=~1 \
    && rm -rf /var/cache/apk/* && \
    addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

WORKDIR /app

COPY --from=build --chown=backend:nodejs /app/service.api/dist ./service.api/dist
COPY --from=build --chown=backend:nodejs /app/service.api/node_modules ./service.api/node_modules
COPY --from=build --chown=backend:nodejs /app/service.api/package*.json ./service.api/

USER backend
WORKDIR /app/service.api
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]

LABEL org.opencontainers.image.title="TypeScript Monorepo Template - API Service"
LABEL org.opencontainers.image.description="Express + TypeScript API service"
LABEL org.opencontainers.image.version="1.0.0"
