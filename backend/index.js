// index.js
const express = require('express');
const connectDB = require('./mongoConnection');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

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
