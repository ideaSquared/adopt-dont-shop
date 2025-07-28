# Multi-stage Dockerfile for lib.permissions

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the library
RUN npm run build

# Create a volume for the built library
VOLUME ["/app/dist"]

# Default command for development
CMD ["npm", "run", "dev"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the library
RUN npm run build && npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built library and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Expose any necessary ports (if applicable)
# EXPOSE 3000

# Default command
CMD ["node", "dist/index.js"]
