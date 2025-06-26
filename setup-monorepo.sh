#!/bin/bash

# Adopt Don't Shop - Fresh Monorepo Setup Script

echo "Setting up Adopt Don't Shop monorepo"

# Create directory structure
mkdir -p packages/lib.components/{src/{components/{ui,forms,layout,data,pet,application,communication},hooks,utils,types}}
mkdir -p packages/app.client/{src/{components,pages,hooks,utils,api,store,types}}
mkdir -p packages/app.admin/{src/{components,pages,hooks,utils,api,store,types}}
mkdir -p packages/app.rescue/{src/{components,pages,hooks,utils,api,store,types}}
mkdir -p packages/service.backend/{src/{controllers,services,models,routes,middleware,utils,config,types}}

# Create root package.json
cat > package.json << 'EOF'
{
  "name": "adopt-dont-shop-monorepo",
  "version": "1.0.0",
  "description": "Adopt Don't Shop - Modern Monorepo Architecture",
  "private": true,
  "workspaces": [
    "packages/lib.components",
    "packages/app.client",
    "packages/app.admin", 
    "packages/app.rescue",
    "packages/service.backend"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:client\" \"npm run dev:admin\" \"npm run dev:rescue\" \"npm run dev:components\"",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "clean": "npm run clean --workspaces && rm -rf node_modules",
    "dev:client": "npm run dev -w packages/app.client",
    "dev:admin": "npm run dev -w packages/app.admin",
    "dev:rescue": "npm run dev -w packages/app.rescue",
    "dev:backend": "npm run dev -w packages/service.backend",
    "dev:components": "npm run dev -w packages/lib.components",
    "build:client": "npm run build -w packages/app.client",
    "build:admin": "npm run build -w packages/app.admin",
    "build:rescue": "npm run build -w packages/app.rescue",
    "build:backend": "npm run build -w packages/service.backend",
    "build:components": "npm run build -w packages/lib.components",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "concurrently": "^8.0.0",
    "eslint": "^8.0.0",
    "eslint-config-prettier": "^8.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^14.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

# Create shared ESLint config
cat > .eslintrc.json << 'EOF'
{
  "root": true,
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error", "info"] }],
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
EOF

# Create shared Prettier config
cat > .prettierrc << 'EOF'
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "auto"
}
EOF

# Create shared TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", "dist", "build"]
}
EOF

# Create Docker Compose for entire app
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: adoptdontshop
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: 
      context: .
      dockerfile: packages/service.backend/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=adoptdontshop
      - PORT=8000
    ports:
      - "8000:8000"
    volumes:
      - ./packages/service.backend:/app/packages/service.backend
      - /app/packages/service.backend/node_modules
    command: npm run dev -w packages/service.backend

  client:
    build:
      context: .
      dockerfile: packages/app.client/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://api.localhost
    volumes:
      - ./packages/app.client:/app/packages/app.client
      - ./packages/lib.components:/app/packages/lib.components
      - /app/packages/app.client/node_modules
      - /app/packages/lib.components/node_modules
    command: npm run dev -w packages/app.client
    depends_on:
      - backend

  admin:
    build:
      context: .
      dockerfile: packages/app.admin/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - VITE_API_URL=http://api.localhost
    volumes:
      - ./packages/app.admin:/app/packages/app.admin
      - ./packages/lib.components:/app/packages/lib.components
      - /app/packages/app.admin/node_modules
      - /app/packages/lib.components/node_modules
    command: npm run dev -w packages/app.admin
    depends_on:
      - backend

  rescue:
    build:
      context: .
      dockerfile: packages/app.rescue/Dockerfile
    ports:
      - "3002:3002"
    environment:
      - VITE_API_URL=http://api.localhost
    volumes:
      - ./packages/app.rescue:/app/packages/app.rescue
      - ./packages/lib.components:/app/packages/lib.components
      - /app/packages/app.rescue/node_modules
      - /app/packages/lib.components/node_modules
    command: npm run dev -w packages/app.rescue
    depends_on:
      - backend
      
volumes:
  postgres-data:
EOF

# Initialize git hooks
mkdir -p .husky
npm pkg set scripts.prepare="husky install"
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
EOF
chmod +x .husky/pre-commit

echo "Monorepo structure setup complete!"

# Create a README.md file
cat > README.md << 'EOF'
# Adopt Don't Shop - Modern Monorepo

This monorepo contains all the applications and services for the Adopt Don't Shop platform.

## Packages

- **lib.components**: Shared React component library
- **app.client**: Public-facing client application
- **app.admin**: Admin dashboard application
- **app.rescue**: Rescue organization application
- **service.backend**: Backend API service

## Development

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- Docker and Docker Compose (for local development)

### Setup

```bash
# Install dependencies
npm install

# Start all services with Docker
docker-compose up

# Start specific services for development
npm run dev:client
npm run dev:admin
npm run dev:rescue
npm run dev:backend
npm run dev:components
```

### Scripts

- `npm run dev`: Start all development servers
- `npm run build`: Build all packages
- `npm run test`: Run tests across all packages
- `npm run lint`: Lint all packages

## Architecture

The monorepo uses a modern architecture with:

1. Shared component library for UI consistency
2. Separate applications for different user types
3. Unified backend API with proper separation of concerns
4. Shared types across packages

## Deployment

Each package can be deployed independently or as part of the complete system.

## License

Copyright © 2025 Adopt Don't Shop
EOF

echo "Setup complete! Run 'npm install' to install dependencies."
