import cors from 'cors'
import dotenv from 'dotenv'
import express, { Request, Response } from 'express'
import { connectToDatabase } from './DatabaseConnection'
import errorHandler from './middlewares/errorHandler'
import adminRoutes from './routes/adminRoutes'
import authRoutes from './routes/authRoutes'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

// Enable CORS
app.use(
  cors({
    origin: 'http://localhost:3001', // Allow only this origin to access the backend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow credentials (cookies, authorization headers, etc.) if needed
  }),
)

// Database connection
connectToDatabase()

// Middleware
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!')
})

// Global error handling middleware
app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
