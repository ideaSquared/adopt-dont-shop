import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import createAuthRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import User from './models/User.js';
import { generateResetToken } from './utils/tokenGenerator.js';
import { sendPasswordResetEmail } from './services/emailService.js';
// testpush
dotenv.config();

const app = express();

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

// Create routes
const authRoutes = createAuthRoutes({
	generateResetToken,
	sendPasswordResetEmail,
	User,
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing: serve your React app
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error-handling middleware
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ message: 'Something went wrong' });
});

export default app;
