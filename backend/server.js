import app from './index.js'; // Adjust the path as needed
import { connectDB } from './dbConnection.js'; // Note the change here
import dotenv from 'dotenv';

dotenv.config();

connectDB(); // Connect to PostgreSQL

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
