import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import sequelize from './sequelize';
import { SocketHandlers } from './socket/socketHandlers';
import { logger } from './utils/logger';
import { printEnvironmentInfo, validateEnvironment } from './utils/validateEnv';

// Import routes
import adminRoutes from './routes/admin.routes';
import applicationRoutes from './routes/application.routes';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import emailRoutes from './routes/email.routes';
import notificationRoutes from './routes/notification.routes';
import petRoutes from './routes/pet.routes';
import rescueRoutes from './routes/rescue.routes';
import userRoutes from './routes/user.routes';

// Import additional routes for PRD compliance
import { Router } from 'express';
import ConfigurationService from './services/configuration.service';
import FeatureFlagService from './services/featureFlag.service';

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

// API routes
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/conversations', chatRoutes);
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rescues', rescueRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/features', featureRoutes);
app.use('/api/v1/config', configRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    features: {
      socketIO: true,
      realTimeMessaging: true,
    },
  });
});

// Apply error handler middleware
app.use(errorHandler);

// Initialize Socket.IO handlers
const socketHandlers = new SocketHandlers(io);

// Start server
const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnvironment();
    printEnvironmentInfo();

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established.');

    // Sync database models (in development)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized.');
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📊 Health check available at http://localhost:${config.port}/health`);
      logger.info(`💬 Socket.IO enabled for real-time messaging`);
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
