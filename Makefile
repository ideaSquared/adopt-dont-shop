# ============================================================================
# Makefile for Adopt Don't Shop - Docker Operations
# ============================================================================
# Industry-standard Makefile for simplified Docker and development operations
# Usage: make [target]
# Example: make dev, make build, make test
# ============================================================================

.PHONY: help dev build test clean up down restart logs shell shell-backend shell-db build-prod deploy health status

# Default target - show help
.DEFAULT_GOAL := help

# ============================================================================
# Configuration
# ============================================================================
DOCKER_COMPOSE := docker-compose
DOCKER_COMPOSE_PROD := docker-compose -f docker-compose.yml -f docker-compose.prod.yml
BUILDKIT_PROGRESS := plain
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# ============================================================================
# Help
# ============================================================================
help: ## Show this help message
	@echo "Adopt Don't Shop - Docker Operations"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

dev: ## Start all services in development mode
	@echo "🚀 Starting development environment..."
	$(DOCKER_COMPOSE) up

dev-detached: ## Start all services in background
	@echo "🚀 Starting development environment (detached)..."
	$(DOCKER_COMPOSE) up -d

dev-build: ## Rebuild and start all services
	@echo "🔨 Building and starting development environment..."
	$(DOCKER_COMPOSE) up --build

dev-backend: ## Start only backend service
	@echo "🚀 Starting backend service..."
	$(DOCKER_COMPOSE) up service-backend database redis

dev-frontend: ## Start only frontend apps
	@echo "🚀 Starting frontend apps..."
	$(DOCKER_COMPOSE) up app-client app-admin app-rescue

##@ Build Operations

build: ## Build all Docker images
	@echo "🔨 Building all images with BuildKit..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build

build-backend: ## Build backend image only
	@echo "🔨 Building backend image..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build service-backend

build-apps: ## Build all frontend app images
	@echo "🔨 Building frontend app images..."
	DOCKER_BUILDKIT=1 docker build --build-arg APP_NAME=app.client -f Dockerfile.app.optimized -t adopt-dont-shop/app-client .
	DOCKER_BUILDKIT=1 docker build --build-arg APP_NAME=app.admin -f Dockerfile.app.optimized -t adopt-dont-shop/app-admin .
	DOCKER_BUILDKIT=1 docker build --build-arg APP_NAME=app.rescue -f Dockerfile.app.optimized -t adopt-dont-shop/app-rescue .

build-prod: ## Build production images
	@echo "🔨 Building production images..."
	$(DOCKER_COMPOSE_PROD) build

build-nocache: ## Build all images without cache
	@echo "🔨 Building all images (no cache)..."
	DOCKER_BUILDKIT=1 $(DOCKER_COMPOSE) build --no-cache

##@ Testing

test: ## Run all tests in Docker
	@echo "🧪 Running tests..."
	$(DOCKER_COMPOSE) run --rm service-backend npm test

test-backend: ## Run backend tests
	@echo "🧪 Running backend tests..."
	$(DOCKER_COMPOSE) run --rm service-backend npm test

test-coverage: ## Run tests with coverage
	@echo "🧪 Running tests with coverage..."
	$(DOCKER_COMPOSE) run --rm service-backend npm run test:coverage

##@ Container Management

up: ## Start all services
	@echo "⬆️  Starting all services..."
	$(DOCKER_COMPOSE) up -d

down: ## Stop all services
	@echo "⬇️  Stopping all services..."
	$(DOCKER_COMPOSE) down

down-volumes: ## Stop all services and remove volumes
	@echo "⬇️  Stopping all services and removing volumes..."
	$(DOCKER_COMPOSE) down -v

restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	$(DOCKER_COMPOSE) restart

restart-backend: ## Restart backend service
	@echo "🔄 Restarting backend service..."
	$(DOCKER_COMPOSE) restart service-backend

##@ Logs & Monitoring

logs: ## Show logs for all services
	$(DOCKER_COMPOSE) logs -f

logs-backend: ## Show backend logs
	$(DOCKER_COMPOSE) logs -f service-backend

logs-client: ## Show client app logs
	$(DOCKER_COMPOSE) logs -f app-client

logs-admin: ## Show admin app logs
	$(DOCKER_COMPOSE) logs -f app-admin

logs-db: ## Show database logs
	$(DOCKER_COMPOSE) logs -f database

health: ## Check health status of all services
	@echo "🏥 Checking service health..."
	@$(DOCKER_COMPOSE) ps

status: ## Show status of all services
	@echo "📊 Service status:"
	@docker ps --filter "name=adopt-dont-shop" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

##@ Shell Access

shell-backend: ## Open shell in backend container
	@echo "🐚 Opening shell in backend container..."
	$(DOCKER_COMPOSE) exec service-backend sh

shell-client: ## Open shell in client app container
	@echo "🐚 Opening shell in client app container..."
	$(DOCKER_COMPOSE) exec app-client sh

shell-db: ## Open PostgreSQL shell
	@echo "🐚 Opening PostgreSQL shell..."
	$(DOCKER_COMPOSE) exec database psql -U $${POSTGRES_USER:-user} -d $${POSTGRES_DB:-adopt_dont_shop_dev}

##@ Database Operations

db-migrate: ## Run database migrations
	@echo "🗄️  Running database migrations..."
	$(DOCKER_COMPOSE) exec service-backend npm run migrate

db-seed: ## Seed database
	@echo "🌱 Seeding database..."
	$(DOCKER_COMPOSE) exec service-backend npm run seed:dev

db-reset: ## Reset database (migrate + seed)
	@echo "🔄 Resetting database..."
	$(DOCKER_COMPOSE) exec service-backend npm run migrate
	$(DOCKER_COMPOSE) exec service-backend npm run seed:dev

db-backup: ## Backup database
	@echo "💾 Backing up database..."
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec -T database pg_dump -U $${POSTGRES_USER:-user} $${POSTGRES_DB:-adopt_dont_shop_dev} > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✅ Backup saved to backups/"

##@ Cleanup

clean: ## Remove containers, networks, and volumes
	@echo "🧹 Cleaning up..."
	$(DOCKER_COMPOSE) down -v --remove-orphans

clean-images: ## Remove all project Docker images
	@echo "🧹 Removing all project images..."
	docker images "adopt-dont-shop/*" -q | xargs -r docker rmi -f

clean-all: clean clean-images ## Remove everything (containers, volumes, images)
	@echo "🧹 Deep clean complete"

prune: ## Prune Docker system (careful!)
	@echo "⚠️  Pruning Docker system..."
	docker system prune -af --volumes

##@ Production

prod-build: build-prod ## Build production images

prod-up: ## Start production environment
	@echo "🚀 Starting production environment..."
	$(DOCKER_COMPOSE_PROD) up -d

prod-down: ## Stop production environment
	@echo "⬇️  Stopping production environment..."
	$(DOCKER_COMPOSE_PROD) down

prod-logs: ## Show production logs
	$(DOCKER_COMPOSE_PROD) logs -f

##@ Security

security-scan: ## Scan images for vulnerabilities (requires trivy)
	@echo "🔒 Scanning images for vulnerabilities..."
	@command -v trivy >/dev/null 2>&1 || { echo "❌ trivy not installed. Install from https://github.com/aquasecurity/trivy"; exit 1; }
	@echo "Scanning backend image..."
	trivy image adopt-dont-shop/service-backend:latest
	@echo "Scanning app images..."
	trivy image adopt-dont-shop/app-client:latest

##@ Utilities

install: ## Install all dependencies (outside Docker)
	@echo "📦 Installing dependencies..."
	npm install

lint: ## Run linters (outside Docker)
	@echo "🔍 Running linters..."
	npm run lint

format: ## Format code (outside Docker)
	@echo "✨ Formatting code..."
	npm run format

validate-env: ## Validate environment variables
	@echo "✅ Validating environment variables..."
	npm run validate:env

##@ Information

info: ## Show Docker and system information
	@echo "ℹ️  System Information:"
	@echo "Docker version:"
	@docker --version
	@echo "\nDocker Compose version:"
	@docker-compose --version
	@echo "\nNode version:"
	@node --version 2>/dev/null || echo "Node not installed locally"
	@echo "\nNpm version:"
	@npm --version 2>/dev/null || echo "npm not installed locally"
	@echo "\nRunning containers:"
	@docker ps --filter "name=adopt-dont-shop" --format "table {{.Names}}\t{{.Status}}"

ports: ## Show port mappings
	@echo "🔌 Port mappings:"
	@echo "Backend API:     http://localhost:5000"
	@echo "Client App:      http://localhost:3000"
	@echo "Admin App:       http://localhost:3001"
	@echo "Rescue App:      http://localhost:3002"
	@echo "Database:        postgresql://localhost:5432"
	@echo "Redis:           redis://localhost:6379"
	@echo "Nginx:           http://localhost:80"
