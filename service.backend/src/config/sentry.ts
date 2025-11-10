import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from '../utils/logger';

type SentryConfig = {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
};

const getSentryConfig = (): SentryConfig => {
  const dsn = process.env.SENTRY_DSN || '';
  const environment = process.env.NODE_ENV || 'development';
  const enabled = Boolean(dsn) && environment !== 'test';

  return {
    dsn,
    environment,
    // Capture 100% of transactions for performance monitoring in development
    // Reduce to 10-20% in production for high-traffic applications
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Profiling sample rate
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    enabled,
  };
};

export const initializeSentry = (): void => {
  const config = getSentryConfig();

  if (!config.enabled) {
    logger.info('Sentry is disabled (no DSN configured or running in test mode)');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      integrations: [
        // Performance Profiling
        nodeProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      // Profiling
      profilesSampleRate: config.profilesSampleRate,
      // Enable debug mode in development
      debug: config.environment === 'development',
      // Release tracking (optional - set via CI/CD)
      release: process.env.SENTRY_RELEASE,
      // Server name
      serverName: process.env.HOSTNAME || 'unknown',
      // Before send hook for filtering/modifying events
      beforeSend(event, hint) {
        // Filter out certain errors or add additional context
        const error = hint.originalException;

        // Don't send validation errors to Sentry
        if (error instanceof Error && error.name === 'ValidationError') {
          return null;
        }

        // Add custom context
        event.extra = {
          ...event.extra,
          nodeVersion: process.version,
          platform: process.platform,
        };

        return event;
      },
    });

    logger.info('Sentry initialized successfully', {
      environment: config.environment,
      tracesSampleRate: config.tracesSampleRate,
      profilesSampleRate: config.profilesSampleRate,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
};

export { Sentry };
