import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { sequelize } from './sequelize';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import petRoutes from './routes/petRoutes';
import applicationRoutes from './routes/applicationRoutes';
import rescueRoutes from './routes/rescueRoutes';
import conversationRoutes from './routes/conversationRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import featureRoutes from './routes/featureRoutes';

// Initialize express app
const app = express();

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/pets', petRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/rescues', rescueRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/features', featureRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Apply error handler middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established.');

    // Sync database models (in development)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized.');
    }

    // Start listening
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('Unhandled Promise rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
