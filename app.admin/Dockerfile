# Multi-stage build for app.admin
FROM node:18-alpine AS base

WORKDIR /app

# Install git for potential git dependencies
RUN apk add --no-cache git

# Development stage
FROM base AS development
# Copy eslint-config packages (workspace dependencies needed for npm install)
COPY eslint-config-base/ ./eslint-config-base/
COPY eslint-config-react/ ./eslint-config-react/

# Copy package files and source code for both app.admin and lib.components
COPY app.admin/package*.json ./app.admin/
COPY lib.components/package*.json ./lib.components/
COPY lib.components/src/ ./lib.components/src/
COPY lib.components/vite.config.ts ./lib.components/
COPY lib.components/tsconfig.json ./lib.components/

# Install dependencies for both
WORKDIR /app/lib.components
RUN npm install
# Clean any existing build artifacts and build fresh
RUN npm run clean && npm run build

WORKDIR /app/app.admin
# Create a temporary package.json without workspace dependencies for Docker
RUN sed 's/"@adopt-dont-shop\/components": "workspace:\*",//g' package.json > package-docker.json && mv package-docker.json package.json
RUN npm install
# Install the local lib.components package
RUN npm install /app/lib.components

# Copy source code (will be overridden by volumes in development)
COPY app.admin/ ./app.admin/
COPY lib.components/ ./lib.components/

WORKDIR /app/app.admin
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
# Copy eslint-config packages (workspace dependencies needed for npm install)
COPY eslint-config-base/ ./eslint-config-base/
COPY eslint-config-react/ ./eslint-config-react/

# Copy package files and source code for both app.admin and lib.components
COPY app.admin/package*.json ./app.admin/
COPY lib.components/package*.json ./lib.components/
COPY lib.components/src/ ./lib.components/src/
COPY lib.components/vite.config.ts ./lib.components/
COPY lib.components/tsconfig.json ./lib.components/

# Install dependencies for both
WORKDIR /app/lib.components
RUN npm install
# Clean any existing build artifacts and build fresh
RUN npm run clean && npm run build

WORKDIR /app/app.admin
# Create a temporary package.json without workspace dependencies for Docker
RUN sed 's/"@adopt-dont-shop\/components": "workspace:\*",//g' package.json > package-docker.json && mv package-docker.json package.json
RUN npm install
# Install the local lib.components package
RUN npm install /app/lib.components

# Copy source code
COPY app.admin/ ./app.admin/
COPY lib.components/ ./lib.components/

WORKDIR /app/app.admin
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/app.admin/dist /usr/share/nginx/html
COPY app.admin/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 