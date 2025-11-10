# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when developing, deploying, or maintaining the Adopt Don't Shop Backend Service. Issues are organized by category with detailed diagnostic steps and solutions.

## General Debugging

### Enable Debug Logging

```bash
# Enable all debug logs
DEBUG=* npm run dev

# Enable specific module debug logs
DEBUG=auth:*,database:* npm run dev

# Set log level
LOG_LEVEL=debug npm run dev
```

### Health Check Diagnostics

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check with service status
curl http://localhost:5000/health/detailed

# Database health check
curl http://localhost:5000/health/db
```

## Database Issues

### Connection Problems

**Symptoms:**
- "Connection refused" errors
- "ECONNREFUSED" errors
- Database timeout errors

**Diagnostics:**
```bash
# Test database connectivity
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Test connection with psql
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Check database logs
docker logs postgres_container

# Verify environment variables
echo $DATABASE_URL
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER
```

**Solutions:**

1. **Database not running:**
   ```bash
   # Start PostgreSQL service
   sudo systemctl start postgresql
   
   # Or start Docker container
   docker start postgres_container
   ```

2. **Wrong connection parameters:**
   ```bash
   # Verify .env file
   cat .env | grep DB_
   
   # Update connection string
   export DATABASE_URL="postgresql://user:pass@host:port/dbname"
   ```

3. **Firewall blocking connection:**
   ```bash
   # Check if port is open
   telnet $DB_HOST $DB_PORT
   
   # Open port in firewall
   sudo ufw allow 5432
   ```

4. **SSL/TLS issues:**
   ```javascript
   // Disable SSL for development
   dialectOptions: {
     ssl: false
   }
   
   // Or configure SSL properly
   dialectOptions: {
     ssl: {
       require: true,
       rejectUnauthorized: false
     }
   }
   ```

### Migration Issues

**Symptoms:**
- Migration fails with SQL errors
- "Table already exists" errors
- "Column does not exist" errors

**Diagnostics:**
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# View migration history
SELECT * FROM "SequelizeMeta";

# Check current database schema
\d+ users
\d+ pets
```

**Solutions:**

1. **Failed migration:**
   ```bash
   # Rollback last migration
   npx sequelize-cli db:migrate:undo
   
   # Fix migration file and re-run
   npx sequelize-cli db:migrate
   ```

2. **Out of sync migrations:**
   ```bash
   # Reset database (development only)
   npx sequelize-cli db:drop
   npx sequelize-cli db:create
   npx sequelize-cli db:migrate
   ```

3. **Manual migration fix:**
   ```sql
   -- Remove migration record
   DELETE FROM "SequelizeMeta" WHERE name = 'problematic-migration.js';
   
   -- Fix database manually
   ALTER TABLE users ADD COLUMN new_column VARCHAR(255);
   
   -- Re-run migration
   ```

### Performance Issues

**Symptoms:**
- Slow query responses
- Database timeouts
- High CPU usage

**Diagnostics:**
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions:**

1. **Missing indexes:**
   ```sql
   -- Add missing indexes
   CREATE INDEX idx_pets_type_status ON pets(type, status);
   CREATE INDEX idx_applications_user_status ON applications(user_id, status);
   ```

2. **Connection pool issues:**
   ```javascript
   // Increase pool size
   pool: {
     max: 20,
     min: 5,
     acquire: 30000,
     idle: 10000
   }
   ```

3. **Query optimization:**
   ```sql
   -- Use EXPLAIN to analyze queries
   EXPLAIN ANALYZE SELECT * FROM pets WHERE type = 'DOG';
   ```

## Authentication Issues

### JWT Token Problems

**Symptoms:**
- "Invalid token" errors
- "Token expired" errors
- Authentication fails silently

**Diagnostics:**
```bash
# Decode JWT token (without verification)
echo "eyJhbGciOiJIUzI1NiIs..." | base64 -d

# Test token with curl
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/users/me

# Check JWT secret
echo $JWT_SECRET | wc -c  # Should be 32+ characters
```

**Solutions:**

1. **Token expired:**
   ```javascript
   // Check token expiration
   const decoded = jwt.decode(token);
   console.log('Token expires at:', new Date(decoded.exp * 1000));
   
   // Refresh token
   const newToken = await refreshAccessToken(refreshToken);
   ```

2. **Wrong JWT secret:**
   ```bash
   # Verify JWT_SECRET in environment
   grep JWT_SECRET .env
   
   # Ensure secret is consistent across environments
   export JWT_SECRET="your-consistent-secret-key"
   ```

3. **Token format issues:**
   ```javascript
   // Ensure proper Bearer format
   const token = authHeader.replace('Bearer ', '');
   
   // Handle missing Authorization header
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Missing or invalid token' });
   }
   ```

### Password Issues

**Symptoms:**
- Login fails with correct password
- Password reset doesn't work
- Hash comparison errors

**Diagnostics:**
```javascript
// Test password hashing
const bcrypt = require('bcrypt');
const password = 'testpassword';
const hash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hash);
console.log('Password valid:', isValid);

// Check stored hash
const user = await User.findOne({ where: { email: 'test@example.com' } });
console.log('Stored hash:', user.passwordHash);
```

**Solutions:**

1. **Bcrypt rounds mismatch:**
   ```javascript
   // Ensure consistent salt rounds
   const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
   const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
   ```

2. **Password reset token issues:**
   ```javascript
   // Check token expiration
   if (user.passwordResetExpires < new Date()) {
     throw new Error('Password reset token expired');
   }
   
   // Generate secure token
   const token = crypto.randomBytes(32).toString('hex');
   ```

## API Issues

### Request/Response Problems

**Symptoms:**
- 404 errors for existing endpoints
- CORS errors
- Request timeout errors
- Malformed JSON responses

**Diagnostics:**
```bash
# Test endpoint availability
curl -I http://localhost:5000/api/v1/pets

# Check CORS headers
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:5000/api/v1/pets

# Test with verbose output
curl -v http://localhost:5000/api/v1/pets
```

**Solutions:**

1. **Route not found:**
   ```javascript
   // Check route registration
   app.use('/api/v1', routes);
   
   // Verify route definition
   router.get('/pets', petController.getAllPets);
   
   // Check middleware order
   app.use(cors());
   app.use('/api/v1', routes);
   ```

2. **CORS issues:**
   ```javascript
   // Configure CORS properly
   app.use(cors({
     origin: process.env.CORS_ORIGIN?.split(',') || '*',
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```

3. **Request timeout:**
   ```javascript
   // Increase timeout
   app.use(timeout('30s'));
   
   // Handle timeout gracefully
   app.use((req, res, next) => {
     if (!req.timedout) next();
   });
   ```

### Validation Errors

**Symptoms:**
- Request validation fails
- Unexpected validation messages
- Schema validation errors

**Diagnostics:**
```javascript
// Test validation schema
const { error } = schema.validate(requestData);
if (error) {
  console.log('Validation errors:', error.details);
}

// Check request body
console.log('Request body:', req.body);
console.log('Content-Type:', req.headers['content-type']);
```

**Solutions:**

1. **Schema validation:**
   ```javascript
   // Update validation schema
   const schema = Joi.object({
     email: Joi.string().email().required(),
     password: Joi.string().min(8).required()
   });
   ```

2. **Content-Type issues:**
   ```javascript
   // Ensure JSON parsing
   app.use(express.json({ limit: '10mb' }));
   app.use(express.urlencoded({ extended: true }));
   ```

## Email Service Issues

### Email Delivery Problems

**Symptoms:**
- Emails not being sent
- Email delivery failures
- SMTP connection errors

**Diagnostics:**
```bash
# Test SMTP connection
telnet smtp.sendgrid.net 587

# Check email queue
SELECT * FROM email_queue WHERE status = 'failed';

# Test email service
curl -X POST http://localhost:5000/api/v1/email/test \
     -H "Content-Type: application/json" \
     -d '{"to": "test@example.com"}'
```

**Solutions:**

1. **SMTP configuration:**
   ```javascript
   // Verify SMTP settings
   const transporter = nodemailer.createTransporter({
     host: process.env.SMTP_HOST,
     port: process.env.SMTP_PORT,
     secure: process.env.SMTP_SECURE === 'true',
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   });
   
   // Test connection
   await transporter.verify();
   ```

2. **API key issues:**
   ```bash
   # Verify SendGrid API key
   curl -X GET "https://api.sendgrid.com/v3/user/account" \
        -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

3. **Email template issues:**
   ```javascript
   // Check template compilation
   try {
     const compiled = handlebars.compile(template);
     const html = compiled(templateData);
   } catch (error) {
     console.error('Template compilation error:', error);
   }
   ```

## File Upload Issues

### Storage Problems

**Symptoms:**
- File upload failures
- "Permission denied" errors
- Storage quota exceeded

**Diagnostics:**
```bash
# Check disk space
df -h

# Check directory permissions
ls -la uploads/

# Test file write permissions
touch uploads/test.txt && rm uploads/test.txt

# Check file size limits
curl -F "file=@large-file.jpg" http://localhost:5000/api/v1/upload
```

**Solutions:**

1. **Permission issues:**
   ```bash
   # Fix directory permissions
   chmod 755 uploads/
   chown www-data:www-data uploads/
   ```

2. **File size limits:**
   ```javascript
   // Increase upload limits
   app.use(express.json({ limit: '50mb' }));
   app.use(express.urlencoded({ limit: '50mb', extended: true }));
   
   // Configure multer limits
   const upload = multer({
     limits: {
       fileSize: 10 * 1024 * 1024 // 10MB
     }
   });
   ```

3. **AWS S3 issues:**
   ```javascript
   // Test S3 connection
   const s3 = new AWS.S3();
   try {
     await s3.headBucket({ Bucket: bucketName }).promise();
   } catch (error) {
     console.error('S3 connection error:', error);
   }
   ```

## Performance Issues

### High Memory Usage

**Symptoms:**
- Application crashes with "out of memory"
- Slow response times
- Memory leaks

**Diagnostics:**
```bash
# Monitor memory usage
top -p $(pgrep node)

# Node.js memory usage
node --inspect app.js
# Then use Chrome DevTools

# Check for memory leaks
node --trace-warnings --trace-deprecation app.js
```

**Solutions:**

1. **Memory leaks:**
   ```javascript
   // Properly close database connections
   process.on('SIGINT', async () => {
     await sequelize.close();
     process.exit(0);
   });
   
   // Remove event listeners
   emitter.removeAllListeners();
   
   // Clear intervals/timeouts
   clearInterval(intervalId);
   ```

2. **Large query results:**
   ```javascript
   // Use pagination
   const pets = await Pet.findAndCountAll({
     limit: 20,
     offset: page * 20
   });
   
   // Stream large datasets
   const stream = Pet.findAll({ raw: true }).stream();
   ```

### High CPU Usage

**Symptoms:**
- Server becomes unresponsive
- High CPU usage in monitoring
- Request timeouts

**Diagnostics:**
```bash
# Monitor CPU usage
htop

# Profile Node.js application
node --prof app.js
node --prof-process isolate-*.log > processed.txt
```

**Solutions:**

1. **Optimize algorithms:**
   ```javascript
   // Use efficient data structures
   const userMap = new Map();
   
   // Avoid nested loops
   const results = pets.filter(pet => 
     petIds.includes(pet.id)
   );
   ```

2. **Add caching:**
   ```javascript
   // Cache frequent queries
   const redis = require('redis');
   const client = redis.createClient();
   
   const cached = await client.get(`pets:${type}`);
   if (cached) {
     return JSON.parse(cached);
   }
   ```

## Docker Issues

### Container Problems

**Symptoms:**
- Container won't start
- "Port already in use" errors
- Container exits immediately

**Diagnostics:**
```bash
# Check container status
docker ps -a

# View container logs
docker logs container_name

# Inspect container
docker inspect container_name

# Check port usage
netstat -tulpn | grep :5000
```

**Solutions:**

1. **Port conflicts:**
   ```bash
   # Kill process using port
   sudo kill -9 $(lsof -ti:5000)
   
   # Use different port
   docker run -p 5001:5000 app_image
   ```

2. **Container exits:**
   ```dockerfile
   # Fix Dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

3. **Volume mount issues:**
   ```bash
   # Fix volume permissions
   docker run -v $(pwd):/app --user $(id -u):$(id -g) app_image
   ```

## Deployment Issues

### Production Deployment

**Symptoms:**
- Application crashes in production
- Environment variable issues
- SSL certificate problems

**Diagnostics:**
```bash
# Check application logs
pm2 logs
journalctl -u app-service

# Verify environment variables
printenv | grep -E "(NODE_ENV|DB_|JWT_)"

# Test SSL certificate
openssl s_client -connect domain.com:443
```

**Solutions:**

1. **Environment configuration:**
   ```bash
   # Set production environment
   export NODE_ENV=production
   
   # Load environment file
   source .env.production
   
   # Verify critical variables
   if [ -z "$JWT_SECRET" ]; then
     echo "JWT_SECRET not set"
     exit 1
   fi
   ```

2. **SSL certificate:**
   ```bash
   # Renew Let's Encrypt certificate
   certbot renew
   
   # Update nginx configuration
   nginx -t && nginx -s reload
   ```

3. **Process management:**
   ```bash
   # Use PM2 for production
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save
   ```

## Monitoring and Alerting

### Log Analysis

**Common log patterns to watch:**

```bash
# Error patterns
grep -E "(ERROR|FATAL)" logs/app.log

# Authentication failures
grep "Invalid credentials" logs/app.log

# Database connection issues
grep "ECONNREFUSED" logs/app.log

# High response times
grep "response_time.*[5-9][0-9][0-9][0-9]" logs/app.log
```

### Health Check Monitoring

```bash
#!/bin/bash
# health-monitor.sh

ENDPOINT="http://localhost:5000/health"
SLACK_WEBHOOK="your-slack-webhook-url"

response=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $response -ne 200 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 API Health Check Failed: HTTP '$response'"}' \
    $SLACK_WEBHOOK
fi
```

## Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **Environment details:**
   ```bash
   node --version
   npm --version
   cat package.json | grep version
   echo $NODE_ENV
   ```

2. **Error logs:**
   ```bash
   tail -n 100 logs/error.log
   docker logs --tail 100 container_name
   ```

3. **System information:**
   ```bash
   uname -a
   free -h
   df -h
   ```

4. **Network information:**
   ```bash
   netstat -tulpn
   curl -I http://localhost:5000/health
   ```

### Common Commands Reference

```bash
# Application management
npm start                    # Start application
npm run dev                  # Start in development mode
npm test                     # Run tests
npm run build               # Build for production

# Database management
npm run db:migrate          # Run migrations
npm run db:seed            # Seed database
npm run db:reset           # Reset database

# Docker management
docker-compose up -d        # Start services
docker-compose logs -f      # View logs
docker-compose down         # Stop services

# Process management
pm2 start app.js           # Start with PM2
pm2 restart app            # Restart application
pm2 logs                   # View logs
pm2 monit                  # Monitor processes
```

---

This troubleshooting guide covers the most common issues encountered with the Adopt Don't Shop Backend Service. For additional help, consult the specific service documentation or contact the development team. 