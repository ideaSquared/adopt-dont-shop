# Multi-stage build for app.rescue
FROM node:18-alpine AS base

WORKDIR /app

# Install git for potential git dependencies
RUN apk add --no-cache git

# Development stage
FROM base AS development
# Copy package files and source code for both app.rescue and lib.components
COPY app.rescue/package*.json ./app.rescue/
COPY lib.components/package*.json ./lib.components/
COPY lib.components/src/ ./lib.components/src/
COPY lib.components/vite.config.ts ./lib.components/
COPY lib.components/tsconfig.json ./lib.components/

# Install dependencies for both
WORKDIR /app/lib.components
RUN npm install
# Clean any existing build artifacts and build fresh
RUN npm run clean && npm run build

WORKDIR /app/app.rescue
# Create a temporary package.json without workspace dependencies for Docker
RUN sed 's/"@adopt-dont-shop\/components": "workspace:\*",//g' package.json > package-docker.json && mv package-docker.json package.json
RUN npm install
# Install the local lib.components package
RUN npm install /app/lib.components

# Copy source code (will be overridden by volumes in development)
COPY app.rescue/ ./app.rescue/
COPY lib.components/ ./lib.components/

WORKDIR /app/app.rescue
EXPOSE 3003
CMD ["npm", "run", "dev"]

# Build stage  
FROM base AS build
# Copy package files and source code for both app.rescue and lib.components
COPY app.rescue/package*.json ./app.rescue/
COPY lib.components/package*.json ./lib.components/
COPY lib.components/src/ ./lib.components/src/
COPY lib.components/vite.config.ts ./lib.components/
COPY lib.components/tsconfig.json ./lib.components/

# Install dependencies for both
WORKDIR /app/lib.components
RUN npm install
# Clean any existing build artifacts and build fresh
RUN npm run clean && npm run build

WORKDIR /app/app.rescue
# Create a temporary package.json without workspace dependencies for Docker
RUN sed 's/"@adopt-dont-shop\/components": "workspace:\*",//g' package.json > package-docker.json && mv package-docker.json package.json
RUN npm install
# Install the local lib.components package
RUN npm install /app/lib.components

# Copy source code
COPY app.rescue/ ./app.rescue/
COPY lib.components/ ./lib.components/

WORKDIR /app/app.rescue
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/app.rescue/dist /usr/share/nginx/html
COPY app.rescue/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
