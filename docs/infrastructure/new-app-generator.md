# New App Generator

## Overview

The `npm run new-app` command scaffolds new applications in the workspace with all established patterns and shared libraries pre-configured.

## Usage

```bash
npm run new-app <app-name> <app-type>
```

### Parameters

- **app-name**: Application name (e.g., `app.mobile`, `app.veterinary`)
- **app-type**: Type of application (`client`, `rescue`, `admin`, `service`)

### App Types

| Type | Description | Use Case |
|------|-------------|----------|
| `client` | Client-facing React app | Public adoption portals |
| `rescue` | Rescue management React app | Rescue staff tools |
| `admin` | Admin dashboard React app | Platform administration |
| `service` | Backend Node.js service | API services |

## Examples

### Frontend Apps

```bash
# Mobile adoption app
npm run new-app app.mobile client

# Veterinary rescue portal
npm run new-app app.veterinary rescue

# Super admin dashboard
npm run new-app app.superadmin admin
```

### Backend Services

```bash
# Notification service
npm run new-app service.notifications service

# Payment processing service
npm run new-app service.payments service
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
    "@adopt-dont-shop/lib-api": "workspace:*",
    "@adopt-dont-shop/lib-auth": "workspace:*",
    "@adopt-dont-shop/lib-validation": "workspace:*",
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
RUN npm ci

# Build libraries
COPY lib.* ./
RUN npm run build:libs

# Build app
FROM base AS build
COPY app.{name} ./app.{name}
RUN cd app.{name} && npm run build

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
npm install
```

### 3. Update docker-compose.yml

Add service to root `docker-compose.yml`:
```yaml
app.{name}:
  build:
    context: .
    dockerfile: app.{name}/Dockerfile
  ports:
    - "300X:3000"  # Choose available port
  environment:
    - VITE_API_BASE_URL=http://api.localhost:5000
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
docker-compose up app.{name}

# Or locally
cd app.{name}
npm run dev
```

## Customization

### Adding More Libraries

Edit `package.json` to add libraries:
```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-storage": "workspace:*",
    "@adopt-dont-shop/lib-email": "workspace:*"
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
npm run build:libs

# Reinstall dependencies
rm -rf node_modules && npm install
```

### Docker Build Fails

```bash
# Clear Docker cache
docker-compose down -v
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache app.{name}
```

## Additional Resources

- **Infrastructure Guide**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Docker Setup**: [docker-setup.md](./docker-setup.md)
- **Microservices Standards**: [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md)
- **Libraries Documentation**: [../libraries/README.md](../libraries/README.md)
