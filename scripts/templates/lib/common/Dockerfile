# Multi-stage Dockerfile for lib.{{LIB_NAME}}

# Development stage
FROM node:22.15.1-alpine AS development

WORKDIR /app

# pnpm via Corepack — version is pinned by package.json "packageManager".
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY src/ ./src/

# Build the library
RUN pnpm run build

# Create a volume for the built library
VOLUME ["/app/dist"]

# Default command for development
CMD ["pnpm", "run", "dev"]

# Production build stage
FROM node:22.15.1-alpine AS build

WORKDIR /app

# pnpm via Corepack — version is pinned by package.json "packageManager".
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN pnpm install

# Copy source code
COPY src/ ./src/

# Build the library
RUN pnpm run build && pnpm prune --prod

# Production stage
FROM node:22.15.1-alpine AS production

WORKDIR /app

# hadolint ignore=DL3018
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    apk add --no-cache dumb-init

# Strip setuid/setgid bits for defence-in-depth
RUN find / -perm /6000 -type f -exec chmod a-s {} + 2>/dev/null || true

# Copy built library and production dependencies
COPY --from=build --chown=appuser:nodejs /app/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=appuser:nodejs /app/package*.json ./

USER appuser

# Library containers have no network service to probe; disable the default
# Dockerfile HEALTHCHECK inherited from the base image.
HEALTHCHECK NONE

# dumb-init reaps orphaned child processes and forwards signals correctly,
# matching the pattern used in service.backend/Dockerfile and Dockerfile.app.
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["node", "dist/index.js"]
