import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limiter';
import sequelize from './sequelize';
import { SocketHandlers } from './socket/socket-handlers';
import { logger } from './utils/logger';
import { printEnvironmentInfo, validateEnvironment } from './utils/validate-env';

// Import models to ensure they're loaded
import './models';

// Import routes
import adminRoutes from './routes/admin.routes';
import applicationRoutes from './routes/application.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import discoveryRoutes from './routes/discovery.routes';
import emailRoutes from './routes/email.routes';
import monitoringRoutes from './routes/monitoring.routes';
import notificationRoutes from './routes/notification.routes';
import petRoutes from './routes/pet.routes';
import rescueRoutes from './routes/rescue.routes';
import userRoutes from './routes/user.routes';

// Import additional routes for PRD compliance
import path from 'path';
import { setupSwagger } from './config/swagger';
import ConfigurationService from './services/configuration.service';
import FeatureFlagService from './services/featureFlag.service';
import { HealthCheckService } from './services/health-check.service';

// Create feature flags and config routes
const featureRoutes = Router();
const configRoutes = Router();

// Feature flags public endpoints
featureRoutes.get('/', async (req, res) => {
  try {
    const flags = await FeatureFlagService.getPublicFlags();
    res.json(flags);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get feature flags' });
  }
});

featureRoutes.get('/:feature', async (req, res) => {
  try {
    const flag = await FeatureFlagService.getFlag(req.params.feature);
    res.json({ enabled: flag?.enabled || false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get feature flag' });
  }
});

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
const server = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Apply middleware
app.use(cors(config.cors));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api', apiLimiter);

// Serve uploaded files in development
if (config.nodeEnv === 'development' && config.storage.provider === 'local') {
  const uploadDir = path.resolve(config.storage.local.directory);
  app.use('/uploads', express.static(uploadDir));
  logger.info(`Serving static files from: ${uploadDir}`);
}

// Setup Swagger UI for API documentation
setupSwagger(app);

// Monitoring routes (development only)
app.use('/monitoring', monitoringRoutes);

// API routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/conversations', chatRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rescues', rescueRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/features', featureRoutes);
app.use('/api/v1/config', configRoutes);

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

// Full health monitoring APIs (available in all environments)
app.get('/api/v1/health', async (req, res) => {
  try {
    const health = await HealthCheckService.getFullHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ error: 'Health check failed' });
  }
});

app.get('/api/v1/health/services', async (req, res) => {
  try {
    const health = await HealthCheckService.getFullHealthCheck();
    res.json(health.services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service health' });
  }
});

app.get('/api/v1/health/metrics', async (req, res) => {
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
});

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

// Enhanced health check endpoints
app.get('/health', async (req, res) => {
  try {
    const health = await HealthCheckService.getFullHealthCheck();

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
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

// Readiness check for Kubernetes
app.get('/health/ready', async (req, res) => {
  try {
    const dbHealth = await HealthCheckService.checkDatabaseHealth();
    if (dbHealth.status === 'unhealthy') {
      return res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }
    res.status(200).json({ status: 'ready', timestamp: new Date() });
  } catch (error) {
    res.status(503).json({ status: 'not ready', reason: 'health check failed' });
  }
});

// Apply error handler middleware
app.use(errorHandler);

// Initialize Socket.IO handlers
new SocketHandlers(io);

// Start server
const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnvironment();
    printEnvironmentInfo();

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
        logger.info('🔧 Development mode detected - preparing fresh database...');
        // Wait for PostGIS to be fully initialized
        logger.info('Waiting for PostGIS extension to be fully ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test PostGIS functionality
        await sequelize.query('SELECT PostGIS_Version();');
        logger.info('PostGIS extension is ready.');

        // Sync database models (force recreate in development)
        await sequelize.sync({ force: true });
        logger.info('Database models synchronized (tables recreated).');

        // Run seeders after models are synced
        logger.info('Running database seeders...');
        const { runAllSeeders } = await import('./seeders');
        await runAllSeeders();
        logger.info('Database seeding completed.');
      } catch (error) {
        logger.error('Failed to sync database models:', error);
        throw error;
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
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await sequelize.close();
          logger.info('Database connection closed.');
          logger.info('Graceful shutdown completed.');
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          throw error;
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
