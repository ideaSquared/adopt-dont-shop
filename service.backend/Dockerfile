# syntax=docker/dockerfile:1.4
# Enable BuildKit features: cache mounts, bind mounts, and advanced layer caching

# ============================================================================
# BASE STAGE - Shared foundation for all stages
# ============================================================================
FROM node:20-alpine AS base

# Install security updates and necessary packages
# hadolint ignore=DL3018
RUN apk update && apk upgrade && apk add --no-cache \
    curl=~8 \
    netcat-openbsd=~1 \
    dumb-init=~1 \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# ============================================================================
# DEPENDENCIES STAGE - Install production dependencies with cache mount
# ============================================================================
FROM base AS dependencies

# Copy workspace configuration from monorepo root
COPY package.json package-lock.json ./
COPY eslint-config-node/ eslint-config-node/

# Copy backend service package files
COPY service.backend/package*.json service.backend/

# Install dependencies from backend directory
WORKDIR /app/service.backend

# Use BuildKit cache mount for npm cache (industry standard optimization)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline && \
    npm cache clean --force

# ============================================================================
# DEVELOPMENT STAGE - Include dev dependencies and source code
# ============================================================================
FROM base AS development

# Copy workspace configuration from monorepo root
COPY package.json package-lock.json ./
COPY eslint-config-node/ eslint-config-node/

# Copy backend service
COPY service.backend/ service.backend/

WORKDIR /app/service.backend

# Install all dependencies (including dev dependencies) with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Expose application port
EXPOSE 5000

# Use dumb-init to handle signals properly (industry best practice)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Development command with hot reload
CMD ["npm", "run", "dev"]

# ============================================================================
# BUILD STAGE - Compile TypeScript and prepare for production
# ============================================================================
FROM base AS build

# Copy workspace configuration from monorepo root
COPY package.json package-lock.json ./
COPY eslint-config-node/ eslint-config-node/

# Copy backend service
COPY service.backend/ service.backend/

WORKDIR /app/service.backend

# Install all dependencies for building
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Build the application
# Set NODE_ENV=production to use compiled library exports instead of source
RUN NODE_ENV=production npm run build && \
    npm prune --omit=dev

# ============================================================================
# PRODUCTION STAGE - Minimal image with only runtime dependencies
# ============================================================================
FROM node:20-alpine AS production

# Install only runtime essentials + security updates
# hadolint ignore=DL3018
RUN apk update && apk upgrade && apk add --no-cache \
    curl=~8 \
    dumb-init=~1 \
    && rm -rf /var/cache/apk/* && \
    # Create non-root user for security (OWASP recommendation)
    addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

WORKDIR /app

# Copy built application and production dependencies from build stage
COPY --from=build --chown=backend:nodejs /app/service.backend/dist ./dist
COPY --from=build --chown=backend:nodejs /app/service.backend/node_modules ./node_modules
COPY --from=build --chown=backend:nodejs /app/service.backend/package*.json ./

# Switch to non-root user (security best practice)
USER backend

# Expose application port
EXPOSE 5000

# Health check (CNCF cloud-native best practice)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Production start command
CMD ["node", "dist/index.js"]

# ============================================================================
# METADATA - Labels following OCI image-spec standard
# ============================================================================
LABEL org.opencontainers.image.title="Adopt Don't Shop - Backend Service"
LABEL org.opencontainers.image.description="Express.js backend API for Adopt Don't Shop platform"
LABEL org.opencontainers.image.vendor="Adopt Don't Shop"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/ideaSquared/adopt-dont-shop"
