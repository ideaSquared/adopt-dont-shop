// server.js
import app from './app.js'; // Adjust the path as needed
import connectDB from './mongoConnection.js';
import dotenv from 'dotenv';

dotenv.config();

connectDB(); // Connect to MongoDB

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
