# Multi-stage build for app.admin
FROM node:20-alpine AS base

# Install git for potential git dependencies
RUN apk add --no-cache git

# Build components library first
FROM base AS components-builder
WORKDIR /components
COPY lib.components/package*.json ./
RUN npm install
COPY lib.components ./
RUN npm run build

# Development stage
FROM base AS development
WORKDIR /app

# Copy package files and install dependencies
COPY app.admin/package*.json ./
# Temporarily replace workspace dependency with file dependency
RUN sed -i 's/"@adopt-dont-shop\/components": "workspace:\*"/"@adopt-dont-shop\/components": "file:\/tmp\/components"/' package.json

# Create temporary components directory and copy built components
RUN mkdir -p /tmp/components
COPY --from=components-builder /components/dist /tmp/components/dist
COPY --from=components-builder /components/package.json /tmp/components/package.json

# Install dependencies
RUN npm install

# Copy application source
COPY app.admin ./

EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage  
FROM base AS build
WORKDIR /app

# Copy package files and install dependencies
COPY app.admin/package*.json ./
# Temporarily replace workspace dependency with file dependency
RUN sed -i 's/"@adopt-dont-shop\/components": "workspace:\*"/"@adopt-dont-shop\/components": "file:\/tmp\/components"/' package.json

# Create temporary components directory and copy built components
RUN mkdir -p /tmp/components
COPY --from=components-builder /components/dist /tmp/components/dist
COPY --from=components-builder /components/package.json /tmp/components/package.json

# Install dependencies
RUN npm install

# Copy application source and build
COPY app.admin ./
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY app.admin/nginx.conf /etc/nginx/conf.d/default.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001 || exit 1

EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"] 