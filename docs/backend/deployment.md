# Deployment Guide

## Overview

This guide covers deploying the Adopt Don't Shop Backend Service across different environments. The service is designed to be cloud-native and supports containerized deployments using Docker and Kubernetes.

## Prerequisites

### System Requirements

**Production Environment:**

- Node.js 18+ LTS
- PostgreSQL 13+
- Redis 6+ (for session storage and caching)
- 2+ CPU cores, 4GB+ RAM
- 20GB+ disk space

**Development Environment:**

- Node.js 18+
- PostgreSQL 13+
- Git
- Docker (optional)

### Required Services

**Database:**

- PostgreSQL with extensions: `uuid-ossp`, `postgis` (for location features)
- Connection pooling recommended (PgBouncer)

**Storage:**

- File storage (AWS S3, Google Cloud Storage, or local)
- CDN for static assets (optional but recommended)

**Email:**

- SMTP provider (SendGrid, Mailgun, or custom SMTP)
- Email templates and transactional email support

**Monitoring:**

- Application monitoring (optional: DataDog, New Relic)
- Log aggregation (optional: ELK stack, Splunk)

## Environment Configuration

### Environment Variables

Create environment-specific `.env` files:

#### Production (.env.production)

```bash
# Application
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-256-bits
JWT_REFRESH_SECRET=your-refresh-token-secret-key-256-bits
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Database
DB_HOST=your-db-host.amazonaws.com
DB_PORT=5432
DB_NAME=adopt_dont_shop_prod
DB_USER=api_user
DB_PASS=your-secure-db-password
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_POOL_IDLE=10000

# Redis (Session Store)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# Email Configuration
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@adoptdontshop.com
EMAIL_FROM_NAME=Adopt Don't Shop

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# File Storage
STORAGE_PROVIDER=s3
AWS_REGION=us-west-2
AWS_S3_BUCKET=adoptdontshop-assets
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# CDN
CDN_BASE_URL=https://cdn.adoptdontshop.com

# CORS
CORS_ORIGIN=https://adoptdontshop.com,https://admin.adoptdontshop.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5

# Monitoring
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
SENTRY_DSN=your-sentry-dsn

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_REAL_TIME_CHAT=true
ENABLE_PUSH_NOTIFICATIONS=true

# Health Checks
HEALTH_CHECK_INTERVAL=30000
DB_HEALTH_CHECK_TIMEOUT=5000

# SSL/TLS
FORCE_HTTPS=true
TRUST_PROXY=true
```

#### Staging (.env.staging)

```bash
# Similar to production but with staging values
NODE_ENV=staging
DB_NAME=adopt_dont_shop_staging
EMAIL_FROM=staging@adoptdontshop.com
CORS_ORIGIN=https://staging.adoptdontshop.com
LOG_LEVEL=debug
```

#### Development (.env.development)

```bash
NODE_ENV=development
PORT=5000
JWT_SECRET=dev-jwt-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
DB_HOST=localhost
DB_NAME=adopt_dont_shop_dev
DB_USER=postgres
DB_PASS=password
EMAIL_PROVIDER=console
STORAGE_PROVIDER=local
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

## Docker Deployment

### Dockerfile

The service includes a production-ready Dockerfile:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Build application
RUN npm run build

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "run", "start:prod"]
```

### Docker Compose

#### Production (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:5000/health']
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: adopt_dont_shop_prod
      POSTGRES_USER: api_user
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - '5432:5432'
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

#### Development (docker-compose.dev.yml)

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - '5000:5000'
    environment:
      - NODE_ENV=development
    env_file:
      - .env.development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres-dev
    command: npm run dev
    networks:
      - dev-network

  postgres-dev:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: adopt_dont_shop_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - '5432:5432'
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    networks:
      - dev-network

volumes:
  postgres_dev_data:

networks:
  dev-network:
    driver: bridge
```

### Running with Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose logs -f api

# Scale the API service
docker-compose up -d --scale api=3
```

## Kubernetes Deployment

### Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: adopt-dont-shop
  labels:
    name: adopt-dont-shop
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: adopt-dont-shop
data:
  NODE_ENV: 'production'
  PORT: '5000'
  API_VERSION: 'v1'
  LOG_LEVEL: 'info'
  DB_HOST: 'postgres-service'
  DB_PORT: '5432'
  DB_NAME: 'adopt_dont_shop_prod'
  REDIS_HOST: 'redis-service'
  REDIS_PORT: '6379'
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: adopt-dont-shop
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  JWT_REFRESH_SECRET: <base64-encoded-secret>
  DB_USER: <base64-encoded-user>
  DB_PASS: <base64-encoded-password>
  SENDGRID_API_KEY: <base64-encoded-key>
  AWS_ACCESS_KEY_ID: <base64-encoded-key>
  AWS_SECRET_ACCESS_KEY: <base64-encoded-secret>
```

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
  namespace: adopt-dont-shop
  labels:
    app: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: adoptdontshop/api:latest
          ports:
            - containerPort: 5000
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 5
          imagePullPolicy: Always
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: adopt-dont-shop
spec:
  selector:
    app: api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: ClusterIP
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: adopt-dont-shop
  annotations:
    kubernetes.io/ingress.class: 'nginx'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/rate-limit: '100'
    nginx.ingress.kubernetes.io/rate-limit-window: '1m'
spec:
  tls:
    - hosts:
        - api.adoptdontshop.com
      secretName: api-tls
  rules:
    - host: api.adoptdontshop.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

### PostgreSQL StatefulSet

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: adopt-dont-shop
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: 'adopt_dont_shop_prod'
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: DB_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: DB_PASS
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '1Gi'
              cpu: '500m'
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 20Gi
```

### Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n adopt-dont-shop
kubectl get services -n adopt-dont-shop
kubectl get ingress -n adopt-dont-shop

# View logs
kubectl logs -f deployment/api-deployment -n adopt-dont-shop

# Scale deployment
kubectl scale deployment api-deployment --replicas=5 -n adopt-dont-shop
```

## Cloud Platform Deployments

### AWS Deployment

#### Using AWS ECS

```json
{
  "family": "adopt-dont-shop-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "adoptdontshop/api:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/adopt-dont-shop-api",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

#### Using AWS Lambda (Serverless)

```yaml
# serverless.yml
service: adopt-dont-shop-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-west-2
  environment:
    NODE_ENV: production
    JWT_SECRET: ${ssm:/adopt-dont-shop/jwt-secret}
    DB_HOST: ${ssm:/adopt-dont-shop/db-host}

functions:
  api:
    handler: dist/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30
    memorySize: 512

plugins:
  - serverless-offline
  - serverless-webpack

custom:
  webpack:
    webpackConfig: webpack.config.js
```

### Google Cloud Platform

#### Using Cloud Run

```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: adopt-dont-shop-api
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/cpu-throttling: 'false'
    spec:
      containerConcurrency: 100
      containers:
        - image: gcr.io/project-id/adopt-dont-shop-api
          ports:
            - containerPort: 5000
          env:
            - name: NODE_ENV
              value: 'production'
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: api-secrets
                  key: jwt-secret
          resources:
            limits:
              cpu: '1'
              memory: '512Mi'
```

### Azure Deployment

#### Using Azure Container Instances

```yaml
# azure-container.yaml
apiVersion: 2019-12-01
location: eastus
name: adopt-dont-shop-api
properties:
  containers:
    - name: api
      properties:
        image: adoptdontshop/api:latest
        ports:
          - port: 5000
            protocol: TCP
        environmentVariables:
          - name: NODE_ENV
            value: production
          - name: JWT_SECRET
            secureValue: your-jwt-secret
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 1
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
      - port: 5000
        protocol: TCP
```

## Database Migrations

### Running Migrations

```bash
# Development
npm run db:migrate

# Production (with explicit environment)
NODE_ENV=production npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Reset database (development only)
npm run db:reset
```

### Migration Scripts

Create deployment-specific migration scripts:

```bash
#!/bin/bash
# scripts/deploy-migrate.sh

set -e

echo "Running database migrations..."

# Backup database before migration
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
npm run db:migrate

echo "Migrations completed successfully"
```

## Health Checks and Monitoring

### Health Check Endpoints

The service provides comprehensive health checks:

```bash
# Simple health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Database connectivity
curl http://localhost:5000/health/db

# External services
curl http://localhost:5000/health/services
```

### Monitoring Setup

#### Application Metrics

```javascript
// metrics.js
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections_total',
  help: 'Total number of active connections',
});
```

#### Log Configuration

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

## SSL/TLS Configuration

### Nginx SSL Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.adoptdontshop.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://api:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.adoptdontshop.com;
    return 301 https://$server_name$request_uri;
}
```

## Backup and Recovery

### Database Backup Scripts

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S).sql"
S3_BUCKET="adoptdontshop-backups"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_NAME

# Compress backup
gzip $BACKUP_NAME

# Upload to S3
aws s3 cp $BACKUP_NAME.gz s3://$S3_BUCKET/database/

# Clean up local backup
rm $BACKUP_NAME.gz

echo "Backup completed: $BACKUP_NAME.gz"
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-db.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Download backup from S3
aws s3 cp s3://adoptdontshop-backups/database/$BACKUP_FILE ./

# Decompress
gunzip $BACKUP_FILE

# Restore database
psql $DATABASE_URL < ${BACKUP_FILE%.gz}

echo "Database restored from $BACKUP_FILE"
```

## Performance Optimization

### Production Optimizations

```javascript
// app.js production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable compression
  app.use(compression());

  // Security headers
  app.use(helmet());

  // Trust proxy
  app.set('trust proxy', 1);

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Static file caching
  app.use(
    express.static('public', {
      maxAge: '1y',
      etag: false,
    })
  );
}
```

### Database Connection Pooling

```javascript
// config/database.js
const config = {
  production: {
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
```

## Troubleshooting

### Common Deployment Issues

**Database Connection Issues:**

```bash
# Check database connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

**Memory Issues:**

```bash
# Monitor memory usage
docker stats

# Kubernetes memory monitoring
kubectl top pods -n adopt-dont-shop
```

**SSL Certificate Issues:**

```bash
# Check certificate validity
openssl x509 -in cert.pem -text -noout

# Test SSL connection
openssl s_client -connect api.adoptdontshop.com:443
```

### Debugging Production Issues

```bash
# View application logs
docker logs -f container_name

# Kubernetes logs
kubectl logs -f deployment/api-deployment -n adopt-dont-shop

# Database logs
docker exec -it postgres_container psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## Security Considerations

### Production Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] SSL/TLS certificates valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation implemented
- [ ] SQL injection protection
- [ ] XSS protection enabled
- [ ] Secrets management configured
- [ ] Audit logging enabled
- [ ] Backup encryption enabled

### Security Monitoring

```javascript
// security-middleware.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

---

This deployment guide provides comprehensive instructions for deploying the Adopt Don't Shop Backend Service across various environments and platforms.
