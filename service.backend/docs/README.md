# Service Backend Documentation

## Overview

The Adopt Don't Shop Backend Service is a comprehensive Node.js/TypeScript API that powers the entire pet adoption platform. It provides secure, scalable, and reliable backend services for user management, pet data, adoption workflows, and communication systems.

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Git

### Development Setup
```bash
# Clone and install
git clone <repository-url>
cd service.backend
npm install

# Environment setup
cp .env.example .env
# Edit .env with your configuration

# Database setup
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### Production Deployment
```bash
# Build and deploy
npm run build
npm run start:prod
```

## Documentation Index

### 📚 **API Documentation**
- [OpenAPI Specification](./openapi.yaml) - Complete API reference
- [Authentication Guide](./authentication.md) - JWT auth, roles, permissions
- [API Endpoints](./api-endpoints.md) - Detailed endpoint documentation
- [Rate Limiting](./rate-limiting.md) - API rate limiting policies

### 🏗️ **Architecture**
- [System Architecture](./architecture.md) - High-level system design
- [Database Schema](./database-schema.md) - Complete database documentation
- [Service Layer](./service-layer.md) - Business logic organization
- [Real-time Features](./real-time.md) - Socket.IO implementation

### 🔧 **Development**
- [Development Guide](./development.md) - Local development setup
- [Testing Strategy](./testing.md) - Unit, integration, and load testing
- [Code Standards](./code-standards.md) - TypeScript best practices
- [Error Handling](./error-handling.md) - Error management patterns

### 🚀 **Deployment & Operations**
- [Deployment Guide](./deployment.md) - Production deployment
- [Environment Configuration](./environment.md) - Environment variables
- [Monitoring & Logging](./monitoring.md) - Observability setup
- [Health Checks](./health-checks.md) - System health monitoring

### 🔒 **Security**
- [Security Guide](./security.md) - Security best practices
- [RBAC System](./rbac.md) - Role-based access control
- [Data Protection](./data-protection.md) - Privacy and compliance
- [Audit Logging](./audit-logging.md) - Security audit trails

### 📧 **Email System**
- [Email Service](./email-service.md) - Email provider integration
- [Email Templates](./email-templates.md) - Template management
- [Email Provider Endpoints](./email-provider-endpoints.md) - Development testing

### 🔄 **Integrations**
- [File Storage](./file-storage.md) - Local and S3 storage
- [Third-party APIs](./integrations.md) - External service integrations
- [Webhooks](./webhooks.md) - Webhook implementation

### 📊 **Analytics & Reporting**
- [Analytics System](./analytics.md) - User and business analytics
- [Reporting](./reporting.md) - Data export and reporting
- [Metrics Collection](./metrics.md) - Performance metrics

## Quick Reference

### 🌐 **Base URLs**
- **Development**: `http://localhost:5000`
- **Staging**: `https://api-staging.adoptdontshop.com`
- **Production**: `https://api.adoptdontshop.com`

### 🔑 **Authentication**
```bash
# Login
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Use JWT token in headers
Authorization: Bearer <jwt_token>
```

### 📋 **Core Endpoints**
- **Users**: `/api/v1/users`
- **Pets**: `/api/v1/pets`
- **Applications**: `/api/v1/applications`
- **Rescues**: `/api/v1/rescues`
- **Chat**: `/api/v1/conversations`
- **Admin**: `/api/v1/admin`

### 🏥 **Health Check**
```bash
# Simple health check
GET /health

# Detailed health check
GET /health/detailed

# Service readiness
GET /health/ready
```

## Technology Stack

### **Core Framework**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Sequelize ORM

### **Authentication & Security**
- **JWT**: JSON Web Tokens with refresh rotation
- **Encryption**: bcrypt for passwords, TLS 1.3 for transport
- **RBAC**: Role-based access control system
- **Rate Limiting**: Express rate limiter

### **Real-time & Communication**
- **WebSockets**: Socket.IO for real-time messaging
- **Email**: Ethereal (dev), SendGrid/SES (prod)
- **File Storage**: Local storage (dev), AWS S3 (prod)

### **Development & Testing**
- **Testing**: Jest with supertest
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Documentation**: OpenAPI/Swagger

### **Monitoring & Operations**
- **Logging**: Winston with structured logging
- **Health Checks**: Custom health check service
- **Error Tracking**: Comprehensive error handling
- **Metrics**: Performance monitoring

## Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Run test suite: `npm test`
5. Submit pull request

### **Code Quality**
- Follow TypeScript best practices
- Write comprehensive tests
- Document public APIs
- Follow security guidelines

### **Pull Request Guidelines**
- Clear description of changes
- Include relevant tests
- Update documentation
- Follow conventional commits

## Support

### **Getting Help**
- 📖 **Documentation**: Start with this documentation
- 🐛 **Issues**: Create GitHub issue for bugs
- 💡 **Features**: Discuss feature requests
- 📧 **Contact**: development@adoptdontshop.com

### **Common Issues**
- **Database Connection**: Check PostgreSQL service and credentials
- **Authentication**: Verify JWT_SECRET in environment
- **File Uploads**: Ensure upload directory permissions
- **Email Testing**: Use Ethereal email for development

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintainers**: Adopt Don't Shop Development Team 