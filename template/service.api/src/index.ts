import 'dotenv/config';

import { ExampleService } from '@my-org/lib.example';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { ApiResponse, HealthStatus } from './types';

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

const exampleService = new ExampleService({
  debug: process.env.NODE_ENV === 'development',
});

app.get('/health/simple', (_req, res) => {
  res.status(200).send('ok');
});

app.get('/health', (_req, res) => {
  const status: HealthStatus = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  };
  const body: ApiResponse<HealthStatus> = {
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  };
  res.status(200).json(body);
});

app.get('/api/v1/items', (_req, res) => {
  const result = exampleService.processItem('sample-item');
  const body: ApiResponse = {
    success: result.success,
    data: result.data,
    timestamp: new Date().toISOString(),
  };
  res.status(result.success ? 200 : 400).json(body);
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = createServer(app);

function startServer(): void {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.info(`service.api listening on http://localhost:${PORT}`);
  });
}

function gracefulShutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

export default app;
