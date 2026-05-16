// Initialize Sentry FIRST - must be before any other imports
import { initializeSentry, Sentry } from './config/sentry';
initializeSentry();

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { HSTS_MAX_AGE_ONE_YEAR_SECONDS } from './constants/security';
import { errorHandler } from './middleware/error-handler';
import { csrfProtection, csrfErrorHandler, getCsrfToken } from './middleware/csrf';
import { metricsMiddleware } from './middleware/metrics';
import { httpAccessLog } from './middleware/morgan';
import { apiLimiter } from './middleware/rate-limiter';
import { requestContextMiddleware } from './middleware/request-context';
import { verifyEmailDeliveryWebhook } from './middleware/webhook-signature';
import sequelize from './sequelize';
import { initializeMessageBroker } from './services/messageBroker.service';
import { SocketHandlers } from './socket/socket-handlers';
import { logger } from './utils/logger';
import { printEnvironmentInfo, validateEnvironment } from './utils/validate-env';

// Import models to ensure they're loaded
import models from './models';
import { installImmutableCreatedAtTriggers } from './models/immutable-created-at';
import { installIsoCheckConstraints } from './models/iso-check-constraints';
import { installAuditLogsImmutableTrigger } from './models/audit-logs-immutable';

// Import routes
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import applicationRoutes from './routes/application.routes';
import applicationProfileRoutes from './routes/application-profile.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import dashboardRoutes from './routes/dashboard.routes';
import discoveryRoutes from './routes/discovery.routes';
import emailRoutes from './routes/email.routes';
import monitoringRoutes from './routes/monitoring.routes';
import notificationRoutes from './routes/notification.routes';
import petRoutes from './routes/pet.routes';
import rescueRoutes from './routes/rescue.routes';
import invitationRoutes from './routes/invitation.routes';
import searchRoutes from './routes/search.routes';
import staffRoutes from './routes/staff.routes';
import supportTicketRoutes from './routes/supportTicket.routes';
import userSupportRoutes from './routes/userSupport.routes';
import moderationRoutes from './routes/moderation.routes';
import userRoutes from './routes/user.routes';
import gdprRoutes from './routes/gdpr.routes';
import fieldPermissionsRoutes from './routes/field-permissions.routes';
import cmsRoutes from './routes/cms.routes';
import healthRoutes from './routes/health.routes';
import metricsRoutes from './routes/metrics.routes';
import reportsRoutes from './routes/reports.routes';
import legalRoutes from './routes/legal.routes';
import privacyRoutes from './routes/privacy.routes';
import uploadRoutes from './routes/upload.routes';
import uploadServeRoutes from './routes/upload-serve.routes';
import { authenticateToken } from './middleware/auth';
import { requireRole } from './middleware/rbac';
import { handleValidationErrors } from './middleware/validation';
import { UserType } from './models/User';
import { emailValidation } from './validation/email.validation';
import { handleDeliveryWebhook } from './controllers/email.controller';

// Import additional routes for PRD compliance
import path from 'path';
import { setupSwagger } from './config/swagger';
import ConfigurationService from './services/configuration.service';
import { HealthCheckService } from './services/health-check.service';

// Create config routes
const configRoutes = Router();

// Public configuration endpoints
configRoutes.get('/', async (req, res) => {
  try {
    const config = await ConfigurationService.getPublicConfigurations();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Initialize express app
const app = express();

// Trust the first proxy hop (nginx in our deploy). Without this, req.ip resolves
// to the proxy container, so per-IP rate limits collapse to a global bucket and
// security logs / audit IP fields lose forensic value.
app.set('trust proxy', 1);

const server = createServer(app);

// ADS-474: explicit CORS allowlists. Without an `allowedHeaders`
// list, the `cors` middleware reflects whatever Access-Control-
// Request-Headers the browser advertises — fine in dev, but it makes
// the surface area opaque in production. Pin both the methods and
// the headers we actually accept.
const ALLOWED_CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_CORS_HEADERS = ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Idempotency-Key'];

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ALLOWED_CORS_METHODS,
    allowedHeaders: ALLOWED_CORS_HEADERS,
    credentials: true,
  },
  transports: config.nodeEnv === 'production' ? ['websocket'] : ['websocket', 'polling'],
});

// Apply middleware
app.use(
  cors({
    ...config.cors,
    methods: ALLOWED_CORS_METHODS,
    allowedHeaders: ALLOWED_CORS_HEADERS,
  })
);

// Sentry instrumentation - automatically instruments Express
// Note: In Sentry v8+, instrumentation is automatic with setupExpressErrorHandler

// Enhanced Security Headers with Helmet
app.use(
  helmet({
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for styled-components runtime style injection; remove when migrating to CSS modules
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          // Explicit WebSocket origins — avoids the `ws:` / `wss:` wildcards that
          // allow connections to any host (BREACH mitigation).
          process.env.API_URL ?? 'http://localhost:5000',
          (process.env.API_URL ?? 'ws://localhost:5000').replace(/^https?/, 'ws'),
          (process.env.API_URL ?? 'wss://localhost:5000').replace(/^https?/, 'wss'),
        ],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"], // Disallow plugins
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"], // Prevent clickjacking via iframes
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"], // X-Frame-Options equivalent in CSP
        upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
      },
    },
    // HTTP Strict Transport Security - force HTTPS
    hsts: {
      maxAge: HSTS_MAX_AGE_ONE_YEAR_SECONDS,
      includeSubDomains: true,
      preload: true,
    },
    // X-Frame-Options - prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // X-Content-Type-Options - prevent MIME sniffing
    noSniff: true,
    // Referrer-Policy - control referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // X-DNS-Prefetch-Control - control DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },
    // X-Download-Options - prevent IE from executing downloads in site's context
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies - control Adobe Flash/PDF cross-domain requests
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  })
);

// ADS-514: Permissions-Policy header. Helmet doesn't ship a
// permissionsPolicy directive in this version, so set it directly.
// Empty allowlists deny these powerful APIs everywhere — the app
// doesn't use geolocation/camera/microphone/payment.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  next();
});

// ADS-397: email-delivery webhook — fully self-contained handler chain mounted
// BEFORE cookieParser so the CSRF middleware (applied directly below) is never
// reached for this path. The route terminates here via handleDeliveryWebhook.
// Raw body parsing is required for HMAC signature verification; the middleware
// re-parses and replaces req.body with the JSON object before validation runs.
app.post(
  '/api/v1/email/webhook/delivery',
  apiLimiter,
  express.raw({ type: '*/*', limit: '5mb' }),
  verifyEmailDeliveryWebhook,
  ...emailValidation.deliveryWebhook,
  handleValidationErrors,
  handleDeliveryWebhook
);

// ADS-457: 10 MB body limits were a DoS amplifier on auth/search/chat
// endpoints that only need a few KB of JSON. Multipart file uploads go
// through multer (not body-parser), so this lower limit doesn't affect
// uploads. Override via MAX_JSON_BODY_BYTES if a specific deployment
// needs a larger ceiling for one route.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Establish AsyncLocalStorage context per-request so model hooks can read
// the authenticated userId for created_by / updated_by stamping. Must come
// before the auth middleware mount points (which fill in userId).
// ADS-405: also generates the correlation ID consumed by the access log
// and Winston format chain — must run before httpAccessLog below.
app.use(requestContextMiddleware);

// ADS-448 / ADS-462: structured access log. Replaces morgan's plaintext
// `combined` output with a Winston JSON line carrying the correlation ID
// generated by requestContextMiddleware.
app.use(httpAccessLog);

// ADS-404: per-request HTTP histogram for the Prometheus scrape endpoint.
app.use(metricsMiddleware);

// Cookie parser for CSRF tokens
app.use(cookieParser());

// Apply rate limiting
app.use('/api', apiLimiter);

// CSRF Protection for state-changing requests
// Provide CSRF token endpoint (must be before csrfProtection middleware)
app.get('/api/v1/csrf-token', getCsrfToken);

// Apply CSRF protection to all /api routes. GET/HEAD/OPTIONS are skipped
// automatically by csrf-csrf's ignoredMethods config. The email webhook POST
// is handled by the fully self-contained route above and never reaches here.
app.use('/api', csrfProtection);

// ADS-429 / ADS-422: upload serving.
//
// The /api/v1/uploads/authorize subrequest endpoint is always mounted so
// nginx can call it in prod even when the Express file-streaming fallback
// is disabled. The /uploads/* streaming fallback is only mounted when
// config.storage.local.serveLocalUploads is true (i.e. dev/test where
// nginx is not in front). In production, nginx serves the file directly
// from the shared volume after a successful auth_request to /authorize,
// so Node never enters the file-streaming path.
if (config.storage.provider === 'local') {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const uploadDir = path.resolve(config.storage.local.directory);

  if (!uploadDir.startsWith(projectRoot + path.sep) && uploadDir !== projectRoot) {
    throw new Error(
      `Unsafe upload directory: "${uploadDir}" is outside project root "${projectRoot}". ` +
        `Set STORAGE_LOCAL_DIRECTORY to a path inside the project.`
    );
  }

  // Always mount the authorize endpoint — nginx needs it in all envs.
  app.use('/', uploadServeRoutes);
  logger.info(`Upload authorize endpoint enabled for directory: ${uploadDir}`);

  if (config.storage.local.serveLocalUploads) {
    logger.info(`Express upload fallback streaming enabled (local dev / no nginx)`);
  } else {
    logger.info(`Express upload fallback streaming disabled — nginx serves /uploads directly`);
  }
}

// Setup Swagger UI for API documentation
setupSwagger(app);

// Monitoring routes (development only)
app.use('/monitoring', monitoringRoutes);

// API routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/profile', applicationProfileRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/conversations', chatRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/gdpr', gdprRoutes);
app.use('/api/v1/rescues', rescueRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/support', userSupportRoutes); // User-facing support tickets
app.use('/api/v1/admin/support', supportTicketRoutes); // Admin support ticket management
app.use('/api/v1/admin/moderation', moderationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/field-permissions', fieldPermissionsRoutes);
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/reports', reportsRoutes); // ADS-105: custom analytics reports
app.use('/api/v1/legal', legalRoutes); // ADS-495: public terms / privacy
app.use('/api/v1/privacy', privacyRoutes); // ADS-427/496/497: GDPR delete + export + consent
app.use('/api/v1/uploads', uploadRoutes); // ADS-588: staged image upload (POST /images)

// ADS-446 / ADS-460: readiness endpoint that probes DB + Redis + BullMQ.
app.use('/api/v1', healthRoutes);

// ADS-404: Prometheus scrape endpoint, gated by METRICS_AUTH_TOKEN.
app.use('/metrics', metricsRoutes);

// Simple health check (no dependencies)
app.get('/api/v1/health/simple', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    message: 'Backend service is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ADS-545: public /health returns only the high-level status + timestamp.
// The richer `services` and `metrics` payloads leak internal infrastructure
// shape (DB host, Redis URL, queue depths, hostnames) and are now gated
// behind admin auth via /api/v1/health/metrics below.
app.get('/api/v1/health', async (req, res) => {
  try {
    const health = await HealthCheckService.getFullHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
    });
  } catch (error) {
    res.status(503).json({ error: 'Health check failed' });
  }
});

// ADS-545: per-service detail behind admin auth. Mirrors /api/v1/health/metrics
// so the previous unauthenticated leak of internal service identifiers is
// closed without losing the operational signal for admins.
app.get(
  '/api/v1/health/services',
  authenticateToken,
  requireRole(UserType.ADMIN),
  async (req, res) => {
    try {
      const health = await HealthCheckService.getFullHealthCheck();
      res.json(health.services);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get service health' });
    }
  }
);

app.get(
  '/api/v1/health/metrics',
  authenticateToken,
  requireRole(UserType.ADMIN),
  async (req, res) => {
    try {
      const health = await HealthCheckService.getFullHealthCheck();
      res.json({
        uptime: health.uptime,
        metrics: health.metrics,
        timestamp: health.timestamp,
        environment: health.environment,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }
);

// Email provider info (development only)
if (config.nodeEnv === 'development') {
  app.get('/api/v1/email/provider-info', async (req, res) => {
    try {
      const EmailService = (await import('./services/email.service')).default;
      const providerInfo = EmailService.getProviderInfo();

      if (!providerInfo) {
        return res.json({
          provider: 'none',
          message: 'No email provider info available',
        });
      }

      res.json({
        provider: 'ethereal',
        ...providerInfo,
        loginUrl: 'https://ethereal.email/login',
        messagesUrl: 'https://ethereal.email/messages',
        instructions: {
          step1: 'Copy the username and password above',
          step2: 'Click "Login to Ethereal" or go to https://ethereal.email/login',
          step3: 'Use the credentials to log in and view all test emails',
          step4: 'Check console logs for direct preview links when emails are sent',
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get email provider info' });
    }
  });
}

// ADS-545: /health returns only the high-level status + timestamp. Detailed
// service / metric payloads are now gated behind admin auth at
// /api/v1/health/services and /api/v1/health/metrics. Docker HEALTHCHECK
// and nginx upstream probes should target /health/simple for the cheap
// liveness check.
app.get('/health', async (req, res) => {
  try {
    const health = await HealthCheckService.getFullHealthCheck();

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check service failed',
      timestamp: new Date(),
    });
  }
});

// Simple health check for load balancers
app.get('/health/simple', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Readiness check for Kubernetes.
// ADS-446 / ADS-460: probes DB, Redis, and BullMQ together so a cache or
// queue outage drops the pod out of the load balancer instead of passing
// silently while the pod still serves traffic.
app.get('/health/ready', async (req, res) => {
  try {
    const [dbHealth, redisHealth, queueHealth] = await Promise.all([
      HealthCheckService.checkDatabaseHealth(),
      HealthCheckService.checkRedisHealth(),
      HealthCheckService.checkQueueHealth(),
    ]);

    const failures: { service: string; details?: string }[] = [];
    if (dbHealth.status === 'unhealthy') {
      failures.push({ service: 'database', details: dbHealth.details });
    }
    if (redisHealth.status === 'unhealthy') {
      failures.push({ service: 'redis', details: redisHealth.details });
    }
    if (queueHealth.status === 'unhealthy') {
      failures.push({ service: 'queue', details: queueHealth.details });
    }

    if (failures.length > 0) {
      return res.status(503).json({ status: 'not ready', failures, timestamp: new Date() });
    }

    res.status(200).json({ status: 'ready', timestamp: new Date() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', reason: 'health check failed' });
  }
});

// Apply error handler middleware
// Order: CSRF errors -> Sentry errors -> general errors
app.use(csrfErrorHandler);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnvironment();
    printEnvironmentInfo();

    // Log cookie security settings so regressions are visible in startup output
    const isProduction = process.env.NODE_ENV === 'production';
    logger.info('Cookie security settings', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      refreshMaxAgeDays: 3,
      accessMaxAgeMinutes: 15,
    });

    // Initialize message broker for scaling
    await initializeMessageBroker();
    logger.info('Message broker initialized');

    // Initialize Socket.IO handlers
    new SocketHandlers(io);

    // ADS-105: optionally start the reports worker. Gated on
    // WORKER_ENABLED so production can run a dedicated worker
    // process, while dev keeps everything in one container.
    if (process.env.WORKER_ENABLED === 'true' || process.env.NODE_ENV === 'development') {
      try {
        const { startReportsWorker } = await import('./workers/reports.worker');
        const w = startReportsWorker();
        if (w) {
          logger.info('Reports worker started');
        }
      } catch (err) {
        logger.warn('Reports worker failed to start (continuing without scheduling)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // ADS-428: schedule + start the retention enforcement job. Both
      // calls are no-ops without REDIS_URL so dev/test boots aren't
      // forced to bring up Redis.
      try {
        const { scheduleRetentionJob, startRetentionWorker } = await import('./jobs/retention.job');
        await scheduleRetentionJob();
        const w = startRetentionWorker();
        if (w) {
          logger.info('Retention worker started');
        }
      } catch (err) {
        logger.warn('Retention job failed to start (continuing without scheduling)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // ADS-544: daily purge of expired RevokedToken rows. Without this
      // the blacklist table grows unbounded since every logout writes a
      // row that's only useful until the token's `exp`.
      try {
        const { scheduleRevokedTokensPurgeJob, startRevokedTokensPurgeWorker } =
          await import('./jobs/revoked-tokens-purge.job');
        await scheduleRevokedTokensPurgeJob();
        const w = startRevokedTokensPurgeWorker();
        if (w) {
          logger.info('Revoked-tokens purge worker started');
        }
      } catch (err) {
        logger.warn('Revoked-tokens purge job failed to start (continuing without scheduling)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // ADS-497 (slice 4): legal re-acceptance reminder cron. Gated
      // behind LEGAL_REMINDER_CRON_ENABLED (default off) AND
      // LEGAL_REMINDER_CRON_DRY_RUN (default on) — so the first deploy
      // is observe-only and operators flip dry-run last.
      try {
        const { scheduleLegalReminderCron, startLegalReminderWorker } =
          await import('./workers/legal-reminder.worker');
        await scheduleLegalReminderCron();
        const w = startLegalReminderWorker();
        if (w) {
          logger.info('Legal reminder worker started');
        }
      } catch (err) {
        logger.warn('Legal reminder cron failed to start (continuing without scheduling)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Test database connection with retry mechanism
    let retries = 5;
    while (retries > 0) {
      try {
        await sequelize.authenticate();
        logger.info('Database connection established.');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        logger.warn(
          `Database connection failed, retrying in 5 seconds... (${retries} retries left)`
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Ensure PostGIS extension is ready before syncing models
    if (config.nodeEnv === 'development') {
      try {
        const forceSeed = process.env.FORCE_SEED === 'true';

        if (forceSeed) {
          logger.info(
            '🔧 Development mode detected - preparing FRESH database (FORCE_SEED=true)...'
          );
        } else {
          logger.info('🔧 Development mode detected - preparing database (fast mode)...');
        }

        // Wait for PostGIS to be fully initialized
        logger.info('Waiting for PostGIS extension to be fully ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test PostGIS functionality
        await sequelize.query('SELECT PostGIS_Version();');
        logger.info('PostGIS extension is ready.');

        // Ensure citext extension is available (plan 5.5.7). CITEXT provides
        // native case-insensitive uniqueness on email columns so the DB enforces
        // the constraint even for raw INSERTs that bypass application hooks.
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS citext;');
        logger.info('citext extension ready.');

        if (forceSeed) {
          // Force recreate database (drops all tables)
          await sequelize.sync({ force: true });
          logger.info('Database models synchronized (tables recreated).');

          // Always run seeders after force sync
          logger.info('Running database seeders...');
          // Dev boot already gated by config.nodeEnv === 'development' and an
          // explicit trigger (FORCE_SEED or empty DB). Confirm the env-guard
          // here so the seed call doesn't refuse the dev bootstrap.
          process.env.ALLOW_DEMO_SEED = 'true';
          const { runAllSeeders } = await import('./seeders');
          await runAllSeeders();
          logger.info('Database seeding completed.');
        } else {
          // Check if database is already populated to avoid slow HMR rebuilds
          let userCount = 0;
          try {
            const UserModule = await import('./models/User');
            const User = UserModule.default;
            userCount = await User.count();
          } catch {
            // Table doesn't exist yet — treat as empty DB
            userCount = 0;
          }

          if (userCount === 0) {
            // Empty DB or schema not yet created — force-create all tables from models
            await sequelize.sync({ force: true });
            logger.info('Database models synchronized (tables created).');
            logger.info('Empty database detected - running seeders...');
            // Dev boot already gated by config.nodeEnv === 'development' and
            // an empty DB. Confirm the env-guard here so the seed call
            // doesn't refuse the dev bootstrap.
            process.env.ALLOW_DEMO_SEED = 'true';
            const { runAllSeeders } = await import('./seeders');
            await runAllSeeders();
            logger.info('Database seeding completed.');
          } else {
            // DB already populated — skip sync entirely to avoid slow HMR rebuilds
            logger.info(`Database already populated (${userCount} users found) - skipping sync.`);
            logger.info(
              '💡 Tip: Use "npm run dev:fresh" to reset database or "npm run seed:dev" to re-seed.'
            );
          }
        }

        // DB-level invariants that aren't expressible in Sequelize models.
        // Idempotent and Postgres-gated; safe to run on every boot path
        // (force-seed, fresh DB, warm reload). Independent — run in parallel.
        // installAuditLogsImmutableTrigger is called unconditionally
        // outside this dev block — see comment below.
        await Promise.all([
          installImmutableCreatedAtTriggers(Object.values(models)),
          installIsoCheckConstraints(),
        ]);
      } catch (error) {
        logger.error('Failed to sync database models:', error);
        throw error;
      }
    }

    // DB-level invariants that aren't expressible in Sequelize models
    // and aren't created by the schema bootstrap (sync in dev, baseline
    // migrations in prod). Postgres-only, idempotent (CREATE OR REPLACE
    // FUNCTION / DROP TRIGGER IF EXISTS), so safe regardless of
    // environment or whether the DB is fresh.
    //
    // History: migration 11-add-audit-log-immutable-trigger originally
    // installed the audit_logs trigger as part of the prod migration
    // sidecar; PR #521 dropped that migration when the forward
    // migrations were folded into models/installers. This boot-time
    // call replaces it so fresh prod DBs continue to get the trigger.
    //
    // installImmutableCreatedAtTriggers and installIsoCheckConstraints
    // run only in dev (their schema-creation pair, sequelize.sync(),
    // only runs in dev) — prod's broader trigger coverage is a separate
    // concern beyond this fix.
    if (sequelize.getDialect() === 'postgres') {
      try {
        await installAuditLogsImmutableTrigger();
      } catch (error) {
        logger.error('Failed to install audit_logs immutable trigger:', error);
        // Non-fatal — the trigger is defence in depth (ADS-508). Boot
        // continues so the HTTP server still comes up; the install
        // failure is loud in logs for operators to investigate.
      }
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📊 Health check available at http://localhost:${config.port}/health`);
      logger.info(`💬 Socket.IO enabled for real-time messaging`);

      // Log rate limiting mode
      if (config.nodeEnv === 'development') {
        logger.warn(
          `⚠️  DEVELOPMENT MODE: Rate limiting is BYPASSED - warnings will be logged when limits would be hit`
        );
      } else {
        logger.info(`🛡️  Rate limiting is ACTIVE for production`);
      }
    });

    // Graceful shutdown
    // Without an explicit process.exit(), Socket.IO connections + timers keep
    // the event loop alive after server.close(), so dumb-init eventually
    // SIGKILLs the container. We exit cleanly after draining, with a 10s
    // force-exit fallback for stuck connections. [ADS-395]
    let shuttingDown = false;
    const gracefulShutdown = (signal: string) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      const forceExitTimer = setTimeout(() => {
        logger.error('Graceful shutdown timed out after 10s — forcing exit.');
        // eslint-disable-next-line no-process-exit -- shutdown handler must terminate the process; throwing would just bubble back into the same handler
        process.exit(1);
      }, 10_000);
      forceExitTimer.unref();

      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          const { messageBroker } = await import('./services/messageBroker.service');
          await messageBroker.disconnect();
          logger.info('Message broker disconnected.');
          await sequelize.close();
          logger.info('Database connection closed.');
          logger.info('Graceful shutdown completed.');
          // eslint-disable-next-line no-process-exit -- shutdown completed cleanly; exit 0 so the orchestrator records success
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          // eslint-disable-next-line no-process-exit -- shutdown failure must terminate non-zero; throwing here would only re-enter the handler
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    throw error; // Don't use process.exit in production-ready code
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise rejection at:', promise, 'reason:', reason);
  // In production, you might want to gracefully shutdown instead
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled promise rejection');
    throw new Error(`Unhandled Promise rejection: ${reason}`);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  throw error;
});

// Start the server
startServer();

export default app;
