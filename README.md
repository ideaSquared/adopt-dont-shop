[![Backend CI](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/frontend-ci.yml/badge.svg?branch=main)](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/frontend-ci.yml)

# Adopt Don't Shop - Pet Adoption Platform

A comprehensive pet adoption platform connecting rescue organizations with potential adopters. Built as a multi-service architecture with React frontends and Node.js backend services.

## 🚀 Quick Start

### For Docker Development

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the applications:**
   - **✅ Recommended:** `http://localhost` (through nginx)
   - **Development only:** `http://localhost:3000` (direct access)

3. **Important:** Use `http://localhost` for proper API routing. Direct access to `:3000` may cause API connectivity issues.

📋 **See [DOCKER-ACCESS-GUIDE.md](./DOCKER-ACCESS-GUIDE.md) for detailed setup instructions and troubleshooting.**

## 🏗️ Architecture

The platform consists of multiple specialized applications:

- **🐕 Client App** - Public-facing pet adoption interface
- **👨‍💼 Admin App** - Administrative dashboard for platform management  
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
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with Sequelize ORM
- **Redis** for caching and sessions
- **JWT** for authentication
- **Socket.io** for WebSocket connections

### Infrastructure
- **Docker** containerization
- **Nginx** reverse proxy
- **Multi-stage builds** for optimization

## 🚀 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### 🐋 Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ideaSquared/adopt-dont-shop.git
   cd adopt-dont-shop
   ```

2. **Start development environment**
   
   **Option A: Turborepo-optimized (Recommended)**
   ```bash
   # Copy environment configuration
   cp .env.example .env
   
   # Start with Turborepo caching and hot reload
   docker-compose -f docker-compose.turbo.yml up --build
   
   # Or start specific apps
   docker-compose -f docker-compose.turbo.yml up app-admin app-client
   ```
   
   **Option B: Traditional setup**
   ```bash
   # Copy environment configuration
   cp .env.example .env
   
   # Start all services with one command
   ./scripts/docker-dev.sh
   ```

3. **Access the applications**
   - **Client App**: http://localhost (Public adoption interface)
   - **Admin App**: http://admin.localhost (Platform administration)
   - **Rescue App**: http://rescue.localhost (Rescue management)
   - **Backend API**: http://api.localhost (API endpoints)

### Manual Setup (Alternative)

If you prefer to run services individually, see the individual README files:
- [Backend Service](./service.backend/README.md)
- [Component Library](./lib.components/README.md)

## 📁 Project Structure

```
adopt-dont-shop/
├── app.client/           # Public adoption interface
├── app.admin/            # Admin dashboard
├── app.rescue/           # Rescue management portal
├── service.backend/      # Main API service
├── lib.components/       # Shared UI component library
├── nginx/               # Reverse proxy configuration
├── scripts/             # Automation scripts
├── docs/                # Documentation
├── docker-compose.yml   # Main Docker configuration
├── DOCKER.md           # Detailed Docker documentation
└── README.md           # This file
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

# API URLs
VITE_API_URL=http://api.localhost
VITE_WS_URL=ws://api.localhost
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

#### **Development with Turborepo (Recommended)**
```bash
# Start development environment with Turborepo
docker-compose -f docker-compose.turbo.yml up --build

# Start specific services
docker-compose -f docker-compose.turbo.yml up app-admin database

# View logs for specific service
docker-compose -f docker-compose.turbo.yml logs -f app-admin

# Stop all services
docker-compose -f docker-compose.turbo.yml down

# Rebuild and restart
docker-compose -f docker-compose.turbo.yml down
docker-compose -f docker-compose.turbo.yml up --build -d

# Access service container
docker-compose -f docker-compose.turbo.yml exec app-admin bash
docker-compose -f docker-compose.turbo.yml exec service-backend bash

# Run Turborepo commands inside container
docker-compose -f docker-compose.turbo.yml exec app-admin turbo run build
docker-compose -f docker-compose.turbo.yml exec app-admin turbo run test
```

#### **Traditional Docker Commands**
```bash
# Start development environment
./scripts/docker-dev.sh

# View logs for specific service
docker-compose logs -f service-backend
docker-compose logs -f app-client

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Access service container
docker-compose exec service-backend bash
docker-compose exec app-client sh
```

### Database Management

#### **With Turborepo Setup**
```bash
# Run migrations
docker-compose -f docker-compose.turbo.yml exec service-backend npm run migrate

# Seed database
docker-compose -f docker-compose.turbo.yml exec service-backend npm run seed

# Reset database (⚠️ destructive)
docker-compose -f docker-compose.turbo.yml down --volumes
docker-compose -f docker-compose.turbo.yml up --build -d
```

#### **With Traditional Setup**
```bash
# Run migrations
docker-compose exec service-backend npm run migrate

# Seed database
docker-compose exec service-backend npm run seed

# Reset database (⚠️ destructive)
docker-compose down --volumes
docker-compose up --build -d
```

## 🧪 Testing

#### **With Turborepo Setup**
```bash
# Test all services using Turborepo
docker-compose -f docker-compose.turbo.yml exec app-admin turbo run test
docker-compose -f docker-compose.turbo.yml exec app-client turbo run test
docker-compose -f docker-compose.turbo.yml exec service-backend npm test

# Run tests with coverage
docker-compose -f docker-compose.turbo.yml exec service-backend npm run test:coverage
docker-compose -f docker-compose.turbo.yml exec app-admin turbo run test:coverage
```

#### **With Traditional Setup**
```bash
# Test all services
docker-compose exec service-backend npm test
docker-compose exec app-client npm test
docker-compose exec app-admin npm test
docker-compose exec app-rescue npm test
docker-compose exec lib-components npm test

# Run tests with coverage
docker-compose exec service-backend npm run test:coverage
```

## 🚀 Production Deployment

#### **With Turborepo (Recommended)**
```bash
# Configure production environment
cp .env.example .env
# Edit .env with production values

# Build production image with Turborepo
docker build -f Dockerfile.turborepo --target production -t adopt-dont-shop-prod .

# Or build specific app
docker build -f Dockerfile.turborepo --build-arg TURBO_FILTER=@adopt-dont-shop/app-admin -t admin-app .

# Run production container
docker run -p 3001:80 adopt-dont-shop-prod
```

#### **Traditional Production Setup**
```bash
# Configure production environment
cp .env.example .env
# Edit .env with production values

# Deploy with production configuration
./scripts/docker-prod.sh
```

Access via:
- **Main Site**: http://localhost
- **Admin Portal**: http://admin.localhost
- **Rescue Portal**: http://rescue.localhost
- **API**: http://api.localhost

For detailed deployment instructions, see [DOCKER.md](./DOCKER.md).

## 📚 Documentation

- **[Docker Setup Guide](./DOCKER.md)** - Comprehensive Docker environment documentation
- **[Turborepo + Docker Guide](./DOCKER-TURBOREPO-GUIDE.md)** - Enhanced development with Turborepo
- **[Service Backend](./service.backend/README.md)** - Backend API documentation
- **[Component Library](./lib.components/README.md)** - Shared components documentation
- **[App Client PRD](./docs/app-client-prd.md)** - Client app requirements
- **[App Admin PRD](./docs/app-admin-prd.md)** - Admin app requirements
- **[App Rescue PRD](./docs/app-rescue-prd.md)** - Rescue app requirements

## 🔄 CI/CD

The project uses GitHub Actions for continuous integration:

- **Backend CI**: Tests, linting, security validation
- **Frontend CI**: Tests, linting, build verification
- **Component Library CI**: Build and test shared components

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

### Common Issues

1. **Port conflicts**: Check if ports 3000-3002, 5000, 5432 are available
2. **Docker issues**: Try `docker system prune -f` to clean up
3. **Database connection**: Check database logs with `docker-compose logs database`
4. **Permission issues**: Make scripts executable with `chmod +x scripts/*.sh`

See [DOCKER.md](./DOCKER.md#troubleshooting) for detailed troubleshooting guide.

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

### **Quick Start (Turborepo + Docker)**
```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
cp .env.example .env
docker-compose -f docker-compose.turbo.yml up --build
```

### **Traditional Setup**
```bash
git clone https://github.com/ideaSquared/adopt-dont-shop.git
cd adopt-dont-shop
cp .env.example .env
./scripts/docker-dev.sh
```

Then visit http://localhost to see the client app in action! 🎉

**✨ Pro tip**: Use the Turborepo setup for faster development with hot reload and smart caching!

## ⚡ Performance & Development Benefits

### **Turborepo + Docker Integration**

This project now features **Turborepo integration** for enhanced development performance:

- **🚀 Smart builds** - Only changed packages are rebuilt
- **📦 Shared cache** - Faster subsequent builds and container restarts
- **🔥 Hot reload** - Instant component updates across apps
- **🎯 Dependency orchestration** - Builds in correct order automatically
- **💾 Cache persistence** - Survives container restarts

### **Performance Comparison**

| Feature | Traditional Docker | Turborepo + Docker |
|---------|-------------------|-------------------|
| Build time (clean) | ~5-10 minutes | ~3-5 minutes |
| Rebuild time | ~3-5 minutes | ~30 seconds |
| Component changes | Manual restart needed | Instant hot reload |
| Cache sharing | No | Yes, across containers |
| Dependency management | Manual | Automatic |

### **Development Workflows**

#### **Component Library Development**
```bash
# Start all apps with hot reload for components
docker-compose -f docker-compose.turbo.yml up app-admin app-client app-rescue

# Edit components in lib.components/src/ 
# → See instant changes in all running apps! 🔥
```

#### **Full Stack Development**
```bash
# Start everything (backend + apps + database)
docker-compose -f docker-compose.turbo.yml up

# Benefits:
# - Turborepo orchestrates builds
# - Shared cache across containers
# - Hot reload for frontend
# - Database + Redis included
```
