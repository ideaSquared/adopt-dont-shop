# CI/CD Workflows for Adopt Don't Shop

This directory contains GitHub Actions workflows for the Adopt Don't Shop platform.

## Workflow Overview

### 1. Service Backend CI (`backend-ci.yml`)
**Triggers:** Changes to `service.backend/` directory
**Purpose:** Tests the Node.js/Express backend service
- Runs on PostgreSQL 15
- Executes linting, tests, and security audits
- Validates environment configuration

### 2. Frontend Apps CI (`frontend-ci.yml`)
**Triggers:** Changes to any frontend app directory
**Purpose:** Tests all frontend applications using a matrix strategy
- **Apps covered:**
  - `app.client` - Client mobile app
  - `app.admin` - Admin dashboard
  - `app.rescue` - Rescue organization app
  - `lib.components` - Shared component library
- Runs linting, tests, and builds for each app

### 3. Docker CI (`docker-ci.yml`)
**Triggers:** Changes to Docker files or main branches
**Purpose:** Builds and tests Docker images
- Builds Docker images for all services
- Tests container startup and basic health checks
- Validates docker-compose configurations
- Tests both development and production setups

### 4. Security & Quality (`security.yml`)
**Triggers:** Push/PR to main branches, daily schedule
**Purpose:** Security scanning and code quality checks
- **Security scans:**
  - npm audit for dependency vulnerabilities
  - CodeQL analysis for code security issues
  - Trivy scanning for Docker image vulnerabilities
  - License compliance checking
- **Dependency review:** Validates new dependencies in PRs

### 5. Deploy (`deploy.yml`)
**Triggers:** Push to `main` (production) or `develop` (staging)
**Purpose:** Automated deployment pipeline
- **Environments:**
  - `main` branch → Production deployment
  - `develop` branch → Staging deployment
- **Features:**
  - Container registry integration
  - Zero-downtime deployments
  - Database migrations (production only)
  - Health checks and rollback capability
  - Slack notifications
  - Automated release creation

## Required Secrets

### Container Registry
- `CONTAINER_REGISTRY` - Registry URL (e.g., ghcr.io)
- `CONTAINER_REGISTRY_USERNAME`
- `CONTAINER_REGISTRY_PASSWORD`

### Deployment
- `DEPLOY_HOST` - Server hostname/IP
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key
- `DEPLOY_PORT` - SSH port (optional, defaults to 22)

### Environment URLs
- `PRODUCTION_URL` - Production application URL
- `STAGING_URL` - Staging application URL

### Notifications (Optional)
- `SLACK_WEBHOOK` - Slack webhook URL for deployment notifications (commented out by default)

## Environment Setup

### Staging Environment
- Deploys from `develop` branch
- Located at `/opt/adopt-dont-shop/staging/` on server
- Uses staging configuration

### Production Environment
- Deploys from `main` branch
- Located at `/opt/adopt-dont-shop/production/` on server
- Includes database migrations
- Creates GitHub releases
- Requires manual approval (configured in GitHub environments)

## Manual Deployment

You can trigger manual deployments using the "Deploy" workflow:
1. Go to Actions → Deploy
2. Click "Run workflow"
3. Select target environment (staging/production)
4. Click "Run workflow"

## Health Checks

All deployments include automated health checks:
- Backend: `GET /health` endpoint
- Frontend apps: Basic connectivity test
- Database: Connection verification
- Services: Container status validation

## Monitoring

- **Build status:** Visible in GitHub Actions tab
- **Security alerts:** GitHub Security tab
- **Deployments:** GitHub Actions status (Slack notifications available but disabled by default)
- **Releases:** Automatic GitHub releases for production deployments

## Troubleshooting

### Failed Tests
1. Check the specific workflow run for error details
2. Review test logs in the "Run Tests" step
3. Ensure all environment variables are properly set

### Failed Deployments
1. Check server connectivity and SSH access
2. Verify Docker and docker-compose are installed on target server
3. Ensure environment variables are configured on the server
4. Check disk space and system resources

### Security Scan Failures
1. Review dependency audit results
2. Update vulnerable packages using `npm audit fix`
3. Check license compliance issues
4. Review CodeQL security findings

## Local Development

To run the same checks locally:

```bash
# Backend tests
cd service.backend
npm test
npm run lint
npm run security:audit

# Frontend tests (for each app)
cd app.client  # or app.admin, app.rescue, lib.components
npm test
npm run lint
npm run build

# Docker builds
docker-compose up --build
``` 