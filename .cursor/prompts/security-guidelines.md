# Security Guidelines

## General Security Considerations

- Sanitize all user inputs thoroughly.
- Parameterize database queries.
- Enforce strong Content Security Policies (CSP).
- Use CSRF protection where applicable.
- Ensure secure cookies (`HttpOnly`, `Secure`, `SameSite=Strict`).
- Limit privileges and enforce role-based access control.
- Implement detailed internal logging and monitoring.

## Enhanced Security Requirements

### Authentication

- JWT with short expiry (15-60 minutes)
- Refresh token rotation
- Multi-factor authentication support
- Account lockout after failed attempts
- Password policy enforcement

### Data Protection

- PII encryption at rest
- Transport layer security (TLSv1.3)
- API keys rotation strategy
- Secrets management (no hardcoded values)
- Data anonymization for non-production

### Attack Prevention

- XSS prevention with Content-Security-Policy
- SQL injection protection
- CSRF token implementation
- Rate limiting with token bucket algorithm
- Input validation with schema validation
