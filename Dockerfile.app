# syntax=docker/dockerfile:1.4
# Enable BuildKit features for advanced caching and performance

# ============================================================================
# Industry Standard Monorepo Workspace Dockerfile (ADS-763)
# ============================================================================
# Uses `turbo prune --docker` to compute the dependency closure for the target
# app and emit:
#   - out/json/      → package.jsons + lockfile slice (cache-friendly install)
#   - out/full/      → source for the app's transitive lib.* deps only
# This removes the hand-maintained 24-lib COPY lists that previously busted
# the install-layer cache whenever ANY lib changed, even libs the app does
# not depend on. Adding a new lib now requires zero Dockerfile edits.

ARG NODE_VERSION=22.15.1
# Pinned by digest (matches node:22.15.1-slim at the time of pinning) so a
# rebuild can't silently pull a different image. Renovate's docker manager
# (pinDigests: true in renovate.json) keeps this current — bump NODE_VERSION
# and the digest together when it opens a PR. If NODE_VERSION is overridden
# without updating the digest, the build fails closed on a manifest mismatch
# rather than silently resolving an unpinned image. [ADS-960]
FROM node:${NODE_VERSION}-slim@sha256:ec318fe0dc46b56bcc1ca42a202738aeb4f3e347a7b4dd9f9f1df12ea7aa385a AS base

WORKDIR /app

# Install necessary packages including wget for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs viteuser

# pnpm via Corepack — version is pinned by package.json "packageManager".
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# ----------------------------------------------------------------------------
# Pruner stage — produces a pruned subgraph for ${APP_NAME}.
# Runs `turbo prune` against a full copy of the monorepo; the output is used
# by both the development and build stages below.
# ----------------------------------------------------------------------------
FROM base AS pruner
ARG APP_NAME

# Full monorepo source is needed for prune to read every workspace's
# package.json. node_modules / dist are excluded via .dockerignore.
COPY . .

RUN pnpm dlx turbo@2.9.18 prune @adopt-dont-shop/app.${APP_NAME} --docker

# Development stage
FROM base AS development
ARG APP_NAME

# Workspace metadata + pruned lockfile (cache-friendly install layer).
# turbo prune emits pnpm-lock.yaml, pnpm-workspace.yaml and .npmrc inside
# out/json/, so this single COPY carries everything pnpm install needs.
COPY --from=pruner --chown=viteuser:nodejs /app/out/json/ ./

# Install dependencies with a BuildKit cache mount. Keyed per app so concurrent
# compose builds get their own pnpm store rather than contending on a shared
# one — see the same pattern in Dockerfile.service.
RUN --mount=type=cache,id=pnpm-dev-${APP_NAME},target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --store-dir=/pnpm/store

# Pruned source — only the lib.* directories the app actually depends on.
COPY --from=pruner --chown=viteuser:nodejs /app/out/full/ ./

USER viteuser

EXPOSE 3000

WORKDIR /app/apps/${APP_NAME}

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pnpm", "run", "dev"]

# ----------------------------------------------------------------------------
# Build stage (production image source)
# ----------------------------------------------------------------------------
FROM base AS build
ARG APP_NAME
# Vite reads these at build time and inlines them into the static bundle.
# Defaulting to empty so the build works without them; deploy.yml passes the
# real values via --build-arg for prod/staging images. Do NOT promote to ENV —
# ARG is sufficient for Vite's build-time substitution and avoids embedding
# secrets in image metadata.
ARG VITE_API_BASE_URL=""
ARG VITE_WS_BASE_URL=""
ARG VITE_SENTRY_DSN=""
ARG VITE_STATSIG_CLIENT_KEY=""
# Sentry sourcemap upload args (optional — build skips upload when secret absent)
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG DEPLOY_SHA=""

# Workspace metadata + pruned lockfile (cache-friendly install layer).
# turbo prune emits the pnpm-lock.yaml / pnpm-workspace.yaml / .npmrc into
# out/json/, so this single COPY carries everything pnpm install needs.
COPY --from=pruner /app/out/json/ ./

# Transfer ownership of the build workspace to viteuser so the non-root
# install and Turbo build can write node_modules and .turbo cache.
RUN chown -R viteuser:nodejs /app

USER viteuser

RUN --mount=type=cache,id=pnpm-build-${APP_NAME},target=/home/viteuser/.pnpm-store,uid=1001 \
    pnpm install --frozen-lockfile --prefer-offline --store-dir=/home/viteuser/.pnpm-store

# Pruned source — only the lib.* directories the app actually depends on.
COPY --from=pruner --chown=viteuser:nodejs /app/out/full/ ./

# turbo prune --docker doesn't copy root-level config files into out/full/.
# Workspace tsconfigs extend ../tsconfig.base.json (ESM build) and lib.types
# additionally extends ../tsconfig.cjs.base.json for its dual ESM+CJS build.
# Mirrors Dockerfile.service.
COPY --chown=viteuser:nodejs tsconfig.base.json tsconfig.cjs.base.json ./

# Build libraries first, then the specific app using Turbo
# Use cache mount for Turbo cache
# The '...' prefix builds all dependencies first, then the target app
# Set NODE_ENV=production to use "import" exports instead of "development" (src/*.ts)
RUN --mount=type=cache,id=turbo-${APP_NAME},target=/app/.turbo,uid=1001 \
    NODE_ENV=production pnpm exec turbo run build --filter=...@adopt-dont-shop/app.${APP_NAME}

# Upload sourcemaps to Sentry using a BuildKit secret so the auth token never
# lands in an image layer. Gracefully skips when the secret is absent so local
# and CI builds work without Sentry credentials configured.
RUN --mount=type=secret,id=sentry_auth \
    if [ -s /run/secrets/sentry_auth ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ]; then \
      export SENTRY_AUTH_TOKEN=$(cat /run/secrets/sentry_auth); \
      pnpm dlx @sentry/cli sourcemaps inject /app/apps/${APP_NAME}/dist && \
      pnpm dlx @sentry/cli sourcemaps upload \
        --org "$SENTRY_ORG" \
        --project "$SENTRY_PROJECT" \
        --release "$DEPLOY_SHA" \
        /app/apps/${APP_NAME}/dist; \
    else \
      echo "No SENTRY_AUTH_TOKEN or SENTRY_ORG/PROJECT — skipping sourcemap upload"; \
    fi

# Strip sourcemaps from the dist directory before they are copied into the
# nginx image — sourcemaps must never be served to end users.
RUN find /app/apps/${APP_NAME}/dist -name '*.map' -delete

# ============================================================================
# PRODUCTION STAGE - Minimal Nginx image for static assets
# ============================================================================
# Uses the unprivileged nginx image (runs as UID 101, listens on 8080) so the
# container does not run as root. [ADS-701]
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:054e14f543eb688809d59ec2ad1644d1a61678e247c87a318ad605977eb37eaf AS production
ARG APP_NAME

# Privileged setup (package upgrade, suid strip, config write). The base image
# drops back to the `nginx` user via the trailing USER directive below before
# the runtime stage starts. [ADS-701]
USER root

# Install security updates
# hadolint ignore=DL3018
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Copy built app from build stage
COPY --from=build /app/apps/${APP_NAME}/dist /usr/share/nginx/html

# Strip setuid/setgid bits from every binary on the image. Nginx workers
# drop privileges after startup; none of the static-serving runtime
# legitimately needs a suid/sgid helper, so removing the bits closes off
# a privilege-escalation path for any RCE. -xdev keeps the find within
# this layer's filesystem.
RUN find / -xdev -perm -4000 -exec chmod -s {} + 2>/dev/null || true && \
    find / -xdev -perm -2000 -exec chmod -s {} + 2>/dev/null || true

# Shared security-header snippet — included by the server block AND by every
# location block that uses its own `add_header` (e.g. static assets,
# /health). Without this include, nginx's add_header inheritance rule
# silently drops the server-level CSP/HSTS/etc. on those responses. [ADS-693]
RUN echo 'add_header X-Frame-Options "SAMEORIGIN" always; \
add_header X-Content-Type-Options "nosniff" always; \
add_header X-XSS-Protection "1; mode=block" always; \
add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always; \
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always; \
# CSP without unsafe-inline / unsafe-eval. styled-components fully replaced \
# by vanilla-extract (.css.ts) — style-src no longer needs unsafe-inline. [ADS-847] \
add_header Content-Security-Policy "default-src '"'"'self'"'"'; script-src '"'"'self'"'"'; style-src '"'"'self'"'"'; img-src '"'"'self'"'"' data: https:; font-src '"'"'self'"'"' data:; connect-src '"'"'self'"'"' wss: https:; frame-ancestors '"'"'none'"'"'; object-src '"'"'none'"'"'; base-uri '"'"'self'"'"'; form-action '"'"'self'"'"'; upgrade-insecure-requests" always;' > /etc/nginx/security-headers.conf

# Create optimized nginx config for SPA with security headers
RUN echo 'events { \
    worker_connections 1024; \
} \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    \
    # Performance optimizations \
    sendfile on; \
    tcp_nopush on; \
    tcp_nodelay on; \
    keepalive_timeout 65; \
    types_hash_max_size 2048; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_comp_level 6; \
    gzip_min_length 1000; \
    gzip_proxied any; \
    gzip_types text/plain text/css text/xml text/javascript \
               application/javascript application/xml+rss application/json \
               application/wasm; \
    \
    server { \
        listen 8080; \
        server_name _; \
        root /usr/share/nginx/html; \
        index index.html; \
        \
        # Security headers (OWASP recommendations + ADS-353 CSP/HSTS) — see \
        # /etc/nginx/security-headers.conf. Re-included in every location \
        # block that uses add_header so headers are not stripped. [ADS-693] \
        include /etc/nginx/security-headers.conf; \
        \
        # SPA routing - all routes to index.html \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        \
        # Static assets with long-term caching \
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ { \
            expires 1y; \
            add_header Cache-Control "public, immutable"; \
            include /etc/nginx/security-headers.conf; \
            access_log off; \
        } \
        \
        # Defense-in-depth: never serve sourcemaps \
        location ~* \.map$ { \
            return 404; \
        } \
        \
        # Health check endpoint \
        location /health { \
            access_log off; \
            return 200 "healthy\n"; \
            add_header Content-Type text/plain; \
            include /etc/nginx/security-headers.conf; \
        } \
    } \
}' > /etc/nginx/nginx.conf

# Drop back to the unprivileged nginx user (UID 101) for runtime. [ADS-701]
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port (unprivileged nginx listens on 8080, not 80) [ADS-701]
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================================
# METADATA - OCI image-spec labels
# ============================================================================
ARG IMAGE_VERSION=dev
LABEL org.opencontainers.image.title="Adopt Don't Shop - Frontend App"
LABEL org.opencontainers.image.description="React + Vite frontend application"
LABEL org.opencontainers.image.vendor="Adopt Don't Shop"
LABEL org.opencontainers.image.version="${IMAGE_VERSION}"
LABEL org.opencontainers.image.source="https://github.com/ideaSquared/adopt-dont-shop"
