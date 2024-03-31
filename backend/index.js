import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import createAuthRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rescueRoutes from './routes/rescueRoutes.js';
import charityRegisterRoutes from './routes/charityAPIRoutes.js';
import companiesHouseRoutes from './routes/companieshouseAPIRoutes.js';
import petRoutes from './routes/petRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import logRoutes from './routes/logRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import { generateResetToken } from './utils/tokenGenerator.js';
import { sendPasswordResetEmail } from './services/emailService.js';

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import LoggerUtil from './utils/Logger.js';

dotenv.config();

const app = express();
app.use(LoggerUtil.httpLogger());

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	integrations: [
		// enable HTTP calls tracing
		new Sentry.Integrations.Http({ tracing: true }),
		// enable Express.js middleware tracing
		new Sentry.Integrations.Express({ app }),
		nodeProfilingIntegration(),
	],
	// Performance Monitoring
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Set sampling rate for profiling - this is relative to tracesSampleRate
	profilesSampleRate: 1.0,
	environment: process.env.SENTRY_ENVIRONMENT, // Set the environment
});

// Since __dirname is not available in ES module scope, we define it manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS configuration
const corsOptions = {
	origin: 'http://localhost:5173',
	credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());
// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Create routes
const authRoutes = createAuthRoutes({
	generateResetToken,
	sendPasswordResetEmail,
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rescue', rescueRoutes);
app.use('/api/charityregister', charityRegisterRoutes);
app.use('/api/companieshouse', companiesHouseRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ratings', ratingRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV !== 'production') {
	app.get('/debug-sentry', function mainHandler(req, res) {
		Sentry.captureMessage('Something happened');
		throw new Error('My first Sentry error!');
	});
}

// Handle SPA routing: serve your React app
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error-handling middleware
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: 'Something went wrong' });
});

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
	// The error id is attached to `res.sentry` to be returned
	// and optionally displayed to the user for support.
	res.statusCode = 500;
	res.end(res.sentry + '\n');
});

export default app;
