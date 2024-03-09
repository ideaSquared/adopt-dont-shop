// index.js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import connectDB from './mongoConnection.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();

// Since __dirname is not available in ES module scope, we define it manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS configuration
const corsOptions = {
	origin: 'http://localhost:5173', // Adjust this to your frontend's origin
	credentials: true, // This is important for cookies, authorization headers with HTTPS
};

app.use(cors(corsOptions));
app.use(cookieParser()); // Use cookie-parser middleware

connectDB(); // Connect to MongoDB

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing: serve your React app
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
