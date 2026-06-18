# New App Generator

## Overview

The `pnpm new-app` command scaffolds new applications in the workspace with all established patterns and shared libraries pre-configured.

## Usage

```bash
pnpm new-app <app-name> [template] [--overwrite]
# or:
pnpm new-app <app-name> --template <template>
```

### Parameters

- **app-name**: Application name (e.g., `app.mobile`, `app.veterinary`)
- **template**: One of `minimal`, `standard`, `enterprise` (defaults to `standard` if omitted)
- **--overwrite**: Replace an existing app directory of the same name

The generator only scaffolds React apps under `app.*`. Backend services are not produced by this script — the backend is a set of microservices under `services/<name>/`; add a new backend domain by creating a new service there, not via this generator.

### Templates

| Template     | Description                                                  | Pre-installed libraries                                                                                                                                                  |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minimal`    | Basic React app with auth and routing                        | `lib.components`, `lib.auth`                                                                                                                                             |
| `standard`   | Full-featured app with data fetching and analytics           | `lib.components`, `lib.auth`, `lib.analytics`, `lib.api`, `@tanstack/react-query`                                                                                        |
| `enterprise` | Complete enterprise app with all features                    | `lib.components`, `lib.auth`, `lib.analytics`, `lib.api`, `lib.feature-flags`, `lib.notifications`, `lib.permissions`, `lib.discovery`, `lib.search`, `@statsig/react-bindings`, `@tanstack/react-query` |

## Examples

```bash
# Mobile adoption app (standard template)
pnpm new-app app.mobile

# Pick a template explicitly
pnpm new-app app.veterinary minimal
pnpm new-app app.superadmin enterprise

# Replace an existing scaffold
pnpm new-app app.mobile standard --overwrite
```

## What Gets Created

### Frontend Apps (client, rescue, admin)

```
app.{name}/
├── src/
│   ├── components/      # React components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React Context providers
│   ├── services/       # Pre-configured API services
│   ├── utils/          # Utility functions
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript definitions
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── .env.example        # Environment template
├── Dockerfile          # Container configuration
├── package.json        # Dependencies (libraries pre-installed)
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite build config
└── README.md           # App documentation
```

**Pre-installed Libraries:**

- Client: api, auth, pets, discovery, chat, analytics, validation
- Rescue: api, auth, pets (enhanced), applications, chat, rescues
- Admin: api, auth, users, rescues, analytics, permissions

### Backend Services

```
service.{name}/
├── src/
│   ├── routes/         # Express routes
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── models/         # Database models
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript definitions
│   └── index.ts        # Server entry point
├── .env.example        # Environment template
├── Dockerfile          # Container configuration
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── README.md           # Service documentation
```

## Configuration

### Generated package.json

Frontend apps include:

```json
{
  "name": "@adopt-dont-shop/app.{name}",
  "dependencies": {
    "@adopt-dont-shop/lib.api": "workspace:*",
    "@adopt-dont-shop/lib.auth": "workspace:*",
    "@adopt-dont-shop/lib.validation": "workspace:*",
    "react": "^18.2.0",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^4.x"
  }
}
```

Backend services include:

```json
{
  "name": "@adopt-dont-shop/service.{name}",
  "dependencies": {
    "express": "^4.x",
    "typescript": "^5.x",
    "sequelize": "^6.x"
  }
}
```

### Generated Dockerfile

Multi-stage build optimized for workspace:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace and install
COPY package*.json ./
RUN pnpm install --frozen-lockfile

# Build libraries
COPY lib.* ./
RUN pnpm build:libs

# Build app
FROM base AS build
COPY app.{name} ./app.{name}
RUN cd app.{name} && pnpm build

# Production
FROM nginx:alpine
COPY --from=build /app/app.{name}/dist /usr/share/nginx/html
```

## Post-Generation Steps

### 1. Configure Environment

```bash
cd app.{name}
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Update docker-compose.yml

Add service to root `docker-compose.yml`:

```yaml
app.{name}:
  build:
    context: .
    dockerfile: app.{name}/Dockerfile
  ports:
    - '300X:3000' # Choose available port
  environment:
    - VITE_API_BASE_URL=http://api.localhost
```

### 4. Update nginx Configuration

Add subdomain routing to `nginx/nginx.conf`:

```nginx
server {
  listen 80;
  server_name {name}.localhost;

  location / {
    proxy_pass http://app.{name}:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
  }
}
```

### 5. Start Development

```bash
# With Docker
docker compose up app.{name}

# Or locally
cd app.{name}
pnpm dev
```

## Customization

### Adding More Libraries

Edit `package.json` to add libraries:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.storage": "workspace:*",
    "@adopt-dont-shop/lib.email": "workspace:*"
  }
}
```

### Modifying Templates

Generator templates located in:

```
scripts/templates/
├── client/     # Client app template
├── rescue/     # Rescue app template
├── admin/      # Admin app template
└── service/    # Backend service template
```

## Best Practices

### Naming Conventions

- Frontend apps: `app.{purpose}` (e.g., `app.mobile`, `app.foster`)
- Backend services: `service.{domain}` (e.g., `service.payments`, `service.analytics`)
- Use lowercase with dots as separators

### Library Selection

- Only include libraries your app actually needs
- Avoid over-installing to keep bundle sizes small
- Use tree-shaking to eliminate unused code

### Configuration

- Use environment variables for all configuration
- Never commit `.env` files
- Provide comprehensive `.env.example`
- Document all environment variables

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process
taskkill /PID <pid> /F
```

### Library Not Found

```bash
# Rebuild libraries
pnpm build:libs

# Reinstall dependencies
rm -rf node_modules && pnpm install
```

### Docker Build Fails

```bash
# Clear Docker cache
docker compose down -v
docker system prune -a

# Rebuild without cache
docker compose build --no-cache app.{name}
```

## Additional Resources

- **Infrastructure Guide**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Docker Setup**: [docker-setup.md](./docker-setup.md)
- **Microservices Standards**: [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md)
- **Libraries Documentation**: [../libraries/README.md](../libraries/README.md)
