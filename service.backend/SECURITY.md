# Security Guide for Adopt Don't Shop Backend Service

## 🔒 Production Security Checklist

### ✅ Priority 1 - Critical Security Requirements (COMPLETED)

- [x] **Remove default JWT secret fallback** - Environment validation enforces JWT_SECRET
- [x] **Configure strict CORS origins** - Production requires explicit CORS_ORIGIN
- [x] **Implement rate limiting** - Multiple rate limiters for different endpoints
- [x] **Add environment validation** - Comprehensive validation with security checks
- [x] **Create .env.example file** - Complete template with security guidelines

### 🚨 Environment Variables Security

#### Required for Production

These variables are enforced by `docker-compose.yml`'s `:?Error: ... required` guards — Compose refuses to start without them. See `.env.example` for the full list and per-variable notes; the authoritative source is the root `.env.example` and `scripts/validate-env.ts`.

```bash
# CRITICAL secrets — generate strong values via `npm run secrets:generate`
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=different-strong-random-secret
SESSION_SECRET=your-session-secret-minimum-32-characters-long
CSRF_SECRET=your-csrf-secret-minimum-32-characters-long
ENCRYPTION_KEY=your-encryption-key-minimum-32-characters-long
UPLOAD_SIGNING_SECRET=your-upload-signing-secret-minimum-32-characters-long

# Database / Redis credentials
DB_PASSWORD=your-secure-database-password-here
REDIS_PASSWORD=your-secure-redis-password-here

# CORS — comma-separated allowed origins
CORS_ORIGIN=https://yourdomain.com
```

#### Security Requirements

- **JWT_SECRET**: Minimum 32 characters, cryptographically random
- **SESSION_SECRET**: Minimum 32 characters, cryptographically random
- **CORS_ORIGIN**: Never use '\*' in production
- **DB_LOGGING**: Must be false in production to prevent credential leaks

### 🛡️ Implemented Security Features

#### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Password Reset**: 3 requests per hour per IP
- **File Upload**: 20 uploads per 15 minutes per IP

#### Authentication Security

- **JWT access tokens**: Short-lived. Default `JWT_EXPIRES_IN=1h` (see `.env.example` and `docker-compose.yml`). Override via the `JWT_EXPIRES_IN` env var to tighten in higher-risk environments (`15m`, `5m`, etc.).
- **Refresh tokens**: 7-day rotation by default (`JWT_REFRESH_EXPIRES_IN`).
- **Password hashing**: bcryptjs with 12+ rounds
- **Account lockout**: Automatic protection against brute force

#### Request Security

- **Helmet.js**: Security headers including CSP, HSTS
- **Content Security Policy**: Strict directives
- **CORS**: Configurable origin restrictions
- **Request size limits**: 10MB for JSON/form data

#### Database Security

- **Logging disabled**: In production to prevent credential exposure
- **Parameterized queries**: Sequelize ORM prevents SQL injection
- **Connection pooling**: Secure connection management

### 🔧 Security Configuration Examples

#### Generate Secure Secrets

```bash
# Generate JWT secret (Unix/Linux/macOS)
openssl rand -base64 32

# Generate JWT secret (Windows PowerShell)
[System.Web.Security.Membership]::GeneratePassword(32, 0)

# Generate using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Nginx Security Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting at proxy level
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 🚀 Production Deployment Security

#### Environment Setup

1. **Never commit .env files** to version control
2. **Use environment-specific secrets** for each deployment
3. **Rotate secrets regularly** (monthly for JWT secrets)
4. **Monitor for credential leaks** in logs and code

#### Infrastructure Security

- **Use HTTPS only** - TLS 1.3 recommended
- **Implement WAF** - Web Application Firewall
- **Network segmentation** - Database access restricted
- **Regular backups** - Encrypted and tested
- **Security monitoring** - Log analysis and alerting

#### Container Security

```dockerfile
# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Set secure file permissions
COPY --chown=nodejs:nodejs . .

# Security scanning
RUN npm audit --audit-level moderate
```

### 📊 Security Monitoring

#### Key Metrics to Monitor

- **Failed authentication attempts** - Alert on patterns
- **Rate limit violations** - Monitor for abuse
- **Database query patterns** - Detect SQL injection attempts
- **File upload patterns** - Monitor for malicious uploads
- **Error rates** - Unusual error patterns may indicate attacks

#### Recommended Tools

- **Audit logging**: All implemented in application
- **Error tracking**: Sentry integration ready
- **Performance monitoring**: APM tools
- **Security scanning**: Regular dependency audits

### 🔄 Security Maintenance

#### Regular Tasks

- [ ] **Weekly**: Review security logs
- [ ] **Monthly**: Rotate JWT and session secrets
- [ ] **Quarterly**: Security audit and penetration testing
- [ ] **Per release**: Dependency security audit

#### Incident Response

1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Containment**: Stop the attack vector
4. **Recovery**: Restore services securely
5. **Lessons learned**: Update security measures

### 📞 Security Contacts

For security issues:

- **Email**: security@adoptdontshop.com
- **Responsible disclosure**: security-reports@adoptdontshop.com
- **Emergency**: security-emergency@adoptdontshop.com

---

**Security Version**: 1.0  
**Compliance**: OWASP Top 10, GDPR, CCPA Ready
