# 🐾 Adopt Don't Shop - Pet Adoption Platform

A comprehensive pet adoption platform connecting rescue organizations with potential adopters. Built with **industry-standard monorepo workspace architecture** using React frontends and Node.js backend services.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/) & Docker Compose (with BuildKit support)
- [Git](https://git-scm.com/)

### 1. Clone & Setup

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
cp .env.example .env
```

### 2. Start Development Environment

**Option A: Using Make (Recommended)** ⚡

```bash
# Start all services
make dev

# Or start in background
make dev-detached

# View logs
make logs
```

**Option B: Using Docker Compose Directly**

```bash
# Start all services
docker-compose up

# Or in background
docker-compose up -d
```

**Option C: Run Services Locally (No Docker)**

```bash
# Install dependencies
npm install

# Start individual services
npm run dev:client    # Port 3000
npm run dev:admin     # Port 3001
npm run dev:rescue    # Port 3002
npm run dev:backend   # Port 5000
```

### 3. Access Applications

- **🌐 Client App**: http://localhost:3000 - Public adoption portal
- **👨‍💼 Admin App**: http://localhost:3001 - Platform management
- **🏥 Rescue App**: http://localhost:3002 - Rescue organizations
- **⚡ Backend API**: http://localhost:5000 - REST API server
- **🔄 Nginx Proxy**: http://localhost:80 - Reverse proxy

## 📖 **Documentation**

Complete documentation is available in the [`docs/`](./docs/) folder:

### 🚀 **Quick Links**

- **[📋 Documentation Index](./docs/README.md)** - Start here for complete documentation
- **[🐋 Docker Guide](./docs/DOCKER.md)** - **NEW!** Comprehensive Docker infrastructure guide
- **[🏗️ Setup Guide](./docs/infrastructure/docker-setup.md)** - Get development environment running
- **[📚 Libraries](./docs/libraries/README.md)** - Shared packages and utilities
- **[🎯 Architecture](./docs/infrastructure/INFRASTRUCTURE.md)** - System design overview

### 👥 **Role-Based Entry Points**

- **New Developer** → [Docker Guide](./docs/DOCKER.md)
- **Frontend Developer** → [Frontend Apps](./docs/frontend/)
- **Backend Developer** → [Backend Services](./docs/backend/)
- **DevOps Engineer** → [Infrastructure](./docs/infrastructure/)

## 🏗️ **Optimized Architecture**

### **Monorepo Workspace Structure**

```
adopt-dont-shop/
├── 📱 Frontend Apps
│   ├── app.client/         # Public adoption portal
│   ├── app.admin/          # Internal management
│   └── app.rescue/         # Rescue organizations
├── 🔧 Backend Services
│   └── service.backend/    # Main API server
├── 📚 Shared Libraries
│   ├── lib.api/           # API client utilities
│   ├── lib.auth/          # Authentication logic
│   ├── lib.chat/          # Real-time messaging
│   ├── lib.validation/    # Data validation
│   └── lib.components/    # React UI components
├── 🗃️ Infrastructure
│   ├── docker-compose.yml # Optimized container setup
│   ├── nginx/             # Reverse proxy config
│   └── scripts/           # Development utilities
└── 📖 Documentation
    └── docs/              # All project documentation
```

- **🏠 Rescue App** - Rescue organization management portal
- **🔧 Backend Service** - Main API and business logic
- **📦 Component Library** - Shared UI components across apps

## 🌟 Features

- **Multi-tenant Architecture**: Separate interfaces for public users, rescue organizations, and administrators
- **Pet Management**: Comprehensive pet profiles with images and detailed information
- **Adoption Workflow**: Streamlined application, review, and approval process
- **Real-time Messaging**: Communication system between adopters and rescues
- **Rating & Reviews**: Feedback system for rescue organizations
- **Analytics Dashboard**: Insights and reporting for platform metrics
- **Image Management**: Secure file upload and storage
- **Role-based Access Control**: Granular permissions system

## 🛠️ Tech Stack

### Frontend Applications

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Styled Components** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **Socket.io** for real-time features

### Backend Service

- **Node.js 20** with Express
- **TypeScript** for type safety
- **PostgreSQL 16** with PostGIS
- **Redis 7** for caching and sessions
- **JWT** for authentication
- **Socket.io** for WebSocket connections

### Infrastructure & DevOps

- **Docker** with **BuildKit** for optimized containerization
- **Nginx** reverse proxy with security headers
- **Turborepo** for monorepo build orchestration
- **Multi-stage builds** for 50% smaller production images
- **GitHub Actions** for CI/CD with security scanning
- **Trivy** for vulnerability scanning

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### Development Setup

1. **Clone and configure**

   ```bash
   git clone https://github.com/ideaSquared/adopt-dont-shop.git
   cd adopt-dont-shop
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment**

   **Using Make (Recommended):**
   ```bash
   make dev
   ```

   **Using Docker Compose:**
   ```bash
   docker-compose up
   ```

3. **Access the applications**
   - **Client App**: http://localhost:3000
   - **Admin App**: http://localhost:3001
   - **Rescue App**: http://localhost:3002
   - **Backend API**: http://localhost:5000

### Useful Commands

```bash
# View all available commands
make help

# Start services in background
make dev-detached

# View logs
make logs

# Run tests
make test

# Access backend shell
make shell-backend

# Database operations
make db-migrate
make db-seed
make db-reset
```

For more details, see the [Docker Guide](./docs/DOCKER.md).

## 📁 Project Structure

```
adopt-dont-shop/
├── 📱 Frontend Apps
│   ├── app.client/         # Public adoption portal (React + Vite)
│   ├── app.admin/          # Internal management (React + Vite)
│   └── app.rescue/         # Rescue organizations (React + Vite)
├── 🔧 Backend Services
│   └── service.backend/    # Main API server (Express + TypeScript)
├── 📚 Shared Libraries (20 packages)
│   ├── lib.api/           # API client utilities
│   ├── lib.auth/          # Authentication logic
│   ├── lib.chat/          # Real-time messaging
│   ├── lib.components/    # React UI components
│   ├── lib.validation/    # Data validation
│   └── ...                # See docs/libraries/ for complete list
├── 🗃️ Infrastructure
│   ├── docker-compose.yml           # Main Docker configuration
│   ├── docker-compose.prod.yml      # Production overrides
│   ├── docker-compose.override.yml.example  # Local customization template
│   ├── Dockerfile.app.optimized     # Optimized frontend Dockerfile
│   ├── Makefile                     # Developer-friendly commands
│   ├── .dockerignore               # Build context optimization
│   ├── nginx/                      # Reverse proxy config
│   └── scripts/                    # Development utilities
└── 📖 Documentation
    └── docs/
        ├── DOCKER.md              # Comprehensive Docker guide
        ├── README.md              # Documentation index
        ├── infrastructure/        # Infrastructure docs
        ├── libraries/            # Library documentation
        ├── frontend/             # Frontend guides
        └── backend/              # Backend guides
```

## 🔧 Development

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=adopt_dont_shop

# Security
JWT_SECRET=your-secure-secret-key

# API URLs - Industry Standard Configuration
VITE_API_BASE_URL=http://api.localhost:5000
VITE_WS_BASE_URL=ws://api.localhost:5000
```

### 🌐 CORS Configuration

**⚡ Centralized CORS Management:** All CORS origins are configured in the root `.env` file for consistency across all applications.

```env
# CORS Configuration - Centralized for all applications
# Includes both direct container access and nginx proxied access
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost,http://admin.localhost,http://admin.localhost:3001,http://rescue.localhost,http://rescue.localhost:3002,http://api.localhost:5000
```

**Supported Access Methods:**

- **Nginx Proxy Access** (Recommended): `http://localhost`, `http://admin.localhost`, `http://rescue.localhost`
- **Direct Container Access**: `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`
- **API Access**: `http://api.localhost:5000`

**Important Notes:**

- **Single Source of Truth**: CORS origins are defined once in the root `.env` file
- **All Apps Included**: Configuration covers both nginx-proxied and direct container access
- **Docker Integration**: The `docker-compose.yml` automatically uses the centralized CORS configuration
- **No Individual App Configuration**: Do not modify CORS settings in individual app `.env` files

**Troubleshooting CORS Issues:**

1. Ensure all your app URLs are included in the root `.env` CORS_ORIGIN setting
2. Restart Docker services after changing CORS configuration: `docker-compose restart service-backend`
3. Use browser dev tools to verify Access-Control-Allow-Origin headers are present
4. Check if you're accessing via nginx proxy (`rescue.localhost`) or direct container (`localhost:3002`)

**⚠️ Important API Endpoint Notes:**

- **All API endpoints use `/api/v1/` prefix** (e.g., `/api/v1/auth/login`, not `/api/auth/login`)
- **Backend API Base URL**: `http://api.localhost:5000` for local development
- **API Documentation**: Available at `http://api.localhost:5000/api/docs` (Swagger UI)
- Always check the backend routes in `service.backend/src/index.ts` for the correct endpoint structure

### Common Commands

```bash
# Development
make dev              # Start all services
make dev-backend      # Start backend only
make dev-frontend     # Start frontend apps only
make logs             # View all logs
make logs-backend     # View backend logs

# Building
make build            # Build all images
make build-backend    # Build backend only
make build-apps       # Build frontend apps

# Testing
make test             # Run all tests
make test-backend     # Run backend tests
make test-coverage    # Run with coverage

# Database
make db-migrate       # Run migrations
make db-seed          # Seed database
make db-reset         # Reset database
make db-backup        # Backup database

# Utilities
make shell-backend    # Access backend shell
make shell-db         # Access PostgreSQL shell
make clean            # Remove containers and volumes
make help             # Show all commands
```

See the [Docker Guide](./docs/DOCKER.md) for comprehensive documentation.

### Backend Development & Hot Reload

The backend supports **hot reload** for optimal developer experience:

```bash
# Normal development (preserves data)
make dev-backend

# Fresh start (clean database)
FORCE_SEED=true docker-compose up service-backend
```

**Features:**
- ⚡ **Fast startup** (~1-2 seconds with existing data)
- 💾 **Data preservation** between reloads
- 🔄 **Auto schema updates**
- 🔥 **Instant hot reload**

### Database Management

```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Reset database (fresh start)
make db-reset

# Backup database
make db-backup

# Access PostgreSQL shell
make shell-db
```

## 🧪 Testing

```bash
# Run all tests
make test

# Run backend tests
make test-backend

# Run tests with coverage
make test-coverage

# Or use Docker Compose directly
docker-compose exec service-backend npm test
docker-compose exec app-client npm test
```

## 🚀 Production Deployment

```bash
# Build production images
make build-prod

# Start production environment
make prod-up

# View production logs
make prod-logs
```

For detailed deployment instructions, see [Docker Guide](./docs/DOCKER.md#production-deployment).

## 📚 Documentation

- **[🐋 Docker Infrastructure Guide](./docs/DOCKER.md)** - **NEW!** Comprehensive Docker setup and best practices
- **[📋 Documentation Index](./docs/README.md)** - Complete documentation overview
- **[🏗️ Infrastructure Guide](./docs/infrastructure/INFRASTRUCTURE.md)** - System architecture
- **[📦 Service Backend](./service.backend/README.md)** - Backend API documentation
- **[🎨 Component Library](./lib.components/README.md)** - Shared components
- **[📱 App Client PRD](./docs/app-client-prd.md)** - Client app requirements
- **[👨‍💼 App Admin PRD](./docs/app-admin-prd.md)** - Admin app requirements
- **[🏥 App Rescue PRD](./docs/app-rescue-prd.md)** - Rescue app requirements

## 🔄 CI/CD

The project uses GitHub Actions for continuous integration:

- **Docker Workflow**: BuildKit-optimized builds, security scanning with Trivy
- **Backend CI**: Tests, linting, security validation
- **Frontend CI**: Tests, linting, build verification
- **Parallel Builds**: Frontend apps build concurrently for faster CI

All workflows use **BuildKit caching** for 40-60% faster builds.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes in the appropriate service directory
4. Run tests: `npm test` in the relevant service
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages
- Test with Docker environment before submitting

## 🐛 Troubleshooting

### Quick Fixes

```bash
# Clean and restart
make clean
make dev

# View logs
make logs

# Check service health
make health

# Rebuild without cache
make build-nocache
```

### Common Issues

1. **Port conflicts**: Check if ports 3000-3002, 5000, 5432 are available
2. **Out of memory**: Increase Docker memory allocation or use `make clean`
3. **Database connection**: Check with `make logs-db`
4. **Slow builds**: Ensure BuildKit is enabled (`export DOCKER_BUILDKIT=1`)

See [Docker Guide - Troubleshooting](./docs/DOCKER.md#troubleshooting) for detailed solutions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Alex Jenkinson** - Founder & Lead Developer

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ideaSquared/adopt-dont-shop/issues)
- **Email**: help@ideasquared.co.uk
- **Documentation**: [Project Wiki](https://github.com/ideaSquared/adopt-dont-shop/wiki)

---

## 🚀 Get Started Now!

### Quick Start (Recommended)

```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
cp .env.example .env
make dev
```

Then visit http://localhost:3000 to see the client app! 🎉

### What Makes This Project Special

✨ **Modern Infrastructure**
- 🚀 **40-60% faster builds** with BuildKit cache mounts
- 🔒 **Security-first** with Trivy scanning, non-root containers, OWASP headers
- 📦 **50% smaller images** through multi-stage builds
- 🎯 **Developer-friendly** with Makefile and comprehensive docs

⚡ **Performance Benefits**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Build time (cached) | ~5min | ~2min | **60% faster** |
| Build context | ~500MB | ~50MB | **10x smaller** |
| Production images | ~400MB | ~200MB | **50% smaller** |
| npm install | ~2min | ~1min | **50% faster** |

🛠️ **Developer Experience**
- Simple commands: `make dev`, `make test`, `make logs`
- Comprehensive troubleshooting guide
- Hot reload for instant feedback
- Local customization with override files

See [docs/DOCKER.md](./docs/DOCKER.md) for complete documentation!
