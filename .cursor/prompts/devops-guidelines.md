# DevOps Guidelines

## Container Orchestration

### Docker-compose configurations

- Use named volumes for data persistence
- Implement health checks for all services
- Set appropriate restart policies (unless-stopped)
- Use environment files (.env) for configuration
- Define memory/CPU limits for production

### Container standards

- Multi-stage builds to minimize image size
- Non-root user execution for security
- Proper signal handling (SIGTERM, SIGINT)
- Use specific version tags, not latest
- Use .dockerignore to reduce context size

### Environment configurations

- Development: Hot reloading, debug tools, volume mounts
- Production: Optimized builds, minimal dependencies
- Testing: In-memory databases, mock services
- Staging: Production-like with sanitized data

## CI/CD Requirements

### GitHub Actions workflows

- Lint, build, test on pull requests
- Security scanning with CodeQL
- Docker image building and pushing
- Automatic deployments to staging
- Manual approval for production

### Deployment strategies

- Blue-green deployments for zero downtime
- Feature flags for controlled rollouts
- Automatic rollback on failure
- Database migration safety checks
- Environment variable validation

### Monitoring

- Health check endpoints
- Prometheus metrics collection
- Logging with structured JSON format
- Error tracking integration (Sentry)
- Performance monitoring (New Relic/Datadog)

## Infrastructure as Code

### Configuration management

- Use Docker Compose for local development
- Consider Kubernetes for production
- Implement infrastructure as code with Terraform or similar
- Version control all configuration
- Document infrastructure dependencies

### Secret management

- Use environment variables for configuration
- Store secrets in a secure vault (HashiCorp Vault, AWS Secrets Manager)
- Rotate credentials regularly
- Implement least privilege principle
- Audit secret access
