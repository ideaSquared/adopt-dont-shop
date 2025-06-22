# Dockerfile for shared components library
FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the library
RUN npm run build

# Development mode - watch for changes
EXPOSE 6006
CMD ["npm", "run", "dev"] 