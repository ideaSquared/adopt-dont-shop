# CI/CD Workflows

This directory contains GitHub Actions workflows for the Adopt Don't Shop platform, following industry-standard practices for modern web applications.

## Workflow Overview

### 🔄 **CI Workflow** (`ci.yml`)
**Purpose**: Main continuous integration pipeline that runs on every push and pull request.

**What it does**:
- ✅ Tests backend with PostgreSQL database
- ✅ Tests all frontend applications in parallel
- ✅ Runs linting and builds for all projects
- ✅ Ensures code quality before merging

**Triggers**: Push/PR to `main` or `develop` branches

---

### 🔒 **Security Workflow** (`security.yml`)
**Purpose**: Automated security scanning and dependency auditing.

**What it does**:
- 🔍 Runs npm audit on all projects
- 🛡️ CodeQL static analysis for security vulnerabilities
- 📦 Dependency review on pull requests
- 📅 Weekly scheduled security scans

**Triggers**: Push/PR to main branches, weekly schedule, manual dispatch

---

### 🐳 **Docker Workflow** (`docker.yml`)
**Purpose**: Container building and Docker Compose testing.

**What it does**:
- 🏗️ Builds Docker images for all services
- 🧪 Tests Docker Compose stack
- ✅ Validates container health and connectivity
- 💾 Uses GitHub Actions cache for faster builds

**Triggers**: Changes to Dockerfiles or service code

---

### 🚀 **Release Workflow** (`release.yml`)
**Purpose**: Automated releases and deployment pipeline.

**What it does**:
- 📝 Creates GitHub releases from tags
- 🐳 Builds and pushes Docker images to registry
- 🚀 Deploys to staging/production environments
- 🏷️ Supports semantic versioning

**Triggers**: Tags starting with `v*`, pushes to `main`, manual dispatch

---

### ✨ **Quality Workflow** (`quality.yml`)
**Purpose**: Code quality, formatting, and type checking.

**What it does**:
- 🔍 TypeScript type checking
- 💅 Code formatting validation
- 📏 ESLint code quality checks
- 📦 Dependency health monitoring
- 🏗️ Build verification

**Triggers**: Push/PR to main branches

---

## Workflow Features

### 🚀 **Performance Optimizations**
- **Concurrency Control**: Cancels old runs when new commits are pushed
- **Matrix Builds**: Parallel execution for multiple projects
- **Caching**: Docker layer caching and npm dependency caching
- **Path Filters**: Only runs when relevant files change

### 🔒 **Security Best Practices**
- **Minimal Permissions**: Each job has only required permissions
- **Secret Management**: Secure handling of credentials
- **Dependency Scanning**: Automated vulnerability detection
- **Code Analysis**: Static security analysis with CodeQL

### 📊 **Monitoring & Reporting**
- **Clear Job Names**: Easy identification of failing steps
- **Detailed Logging**: Comprehensive output for debugging
- **Failure Handling**: Graceful error handling and cleanup
- **Status Checks**: Required checks for branch protection

---

## Setup Requirements

### Required Secrets
For the release workflow to function fully, add these secrets to your repository:

```bash
# Docker Hub (optional - for image publishing)
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Deployment (when ready)
DEPLOY_HOST=your-server-hostname
DEPLOY_USER=deployment-user
DEPLOY_SSH_KEY=your-private-ssh-key
```

### Branch Protection
Recommended branch protection rules for `main`:

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required status checks:
  - `Backend Tests`
  - `Frontend Tests`
  - `Client App Tests`
  - `Code Quality`
  - `Build Check`

---

## Usage Examples

### Running Tests Locally
```bash
# Backend tests
cd service.backend && npm test

# Frontend tests
cd app.admin && npm test

# All linting
npm run lint
```

### Manual Deployment
```bash
# Trigger manual deployment
gh workflow run release.yml -f environment=staging
```

### Creating a Release
```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This triggers automatic release creation
```

---

## Monitoring

### Workflow Status
- 📊 **Actions Tab**: View all workflow runs
- 📧 **Notifications**: Configure email/Slack notifications
- 🔍 **Logs**: Detailed execution logs for debugging

### Performance Metrics
- ⏱️ **Build Times**: Monitor workflow execution duration
- 💾 **Cache Hit Rates**: Track caching effectiveness
- 📈 **Success Rates**: Monitor workflow reliability

---

## Troubleshooting

### Common Issues

**Tests Failing**:
- Check test logs in the Actions tab
- Ensure all dependencies are properly installed
- Verify environment variables are set correctly

**Docker Build Issues**:
- Check Dockerfile syntax
- Ensure all required files are included in build context
- Verify base image availability

**Security Scan Failures**:
- Review npm audit output
- Update vulnerable dependencies
- Check CodeQL findings in Security tab

### Getting Help
- 📖 Check workflow logs for detailed error messages
- 🐛 Review failed steps and their output
- 💬 Create an issue with workflow run URL for support

---

*This workflow structure follows GitHub's recommended practices and industry standards for CI/CD pipelines.* 