import cors from 'cors'
import dotenv from 'dotenv'
import express, { Application, Request, Response } from 'express'
import path from 'path'
import { connectToDatabase } from './DatabaseConnection'
import errorHandler from './middleware/errorHandler'
import adminRoutes from './routes/adminRoutes'
import applicationRoutes from './routes/applicationRoutes'
import auditLogRoutes from './routes/auditLogRoutes'
import authRoutes from './routes/authRoutes'
import conversationRoutes from './routes/conversationRoutes'
import featureFlagRoutes from './routes/featureFlagRoutes'
import messageRoutes from './routes/messageRoutes'
import participantRoutes from './routes/participantRoutes'
import petImageRoutes from './routes/petImageRoutes'
import petRoutes from './routes/petRoutes'
import ratingRoutes from './routes/ratingRoutes'
import rescueRoutes from './routes/rescueRoutes'
import { AuditLogger } from './services/auditLogService'

dotenv.config()

const app: Application = express()
app.use(express.json())
const port = process.env.PORT || 5000

// Enable CORS
app.use(
  cors({
    origin: 'http://localhost:3001', // Allow only this origin to access the backend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow credentials (cookies, authorization headers, etc.) if needed
  }),
)
AuditLogger.logAction('Server', 'CORS setup complete', 'INFO')

// Database connection
connectToDatabase()
  .then(() => {
    AuditLogger.logAction('Server', 'Database connected successfully', 'INFO')
  })
  .catch((error) => {
    AuditLogger.logAction(
      'Server',
      `Database connection failed: ${(error as Error).message}`,
      'ERROR',
    )
  })

// Middleware
app.use(express.json())
AuditLogger.logAction(
  'Server',
  'Express JSON middleware setup complete',
  'INFO',
)

// Routes
app.use('/api/auth', authRoutes)
AuditLogger.logAction('Server', 'Auth routes setup complete', 'INFO')

app.use('/api/admin', adminRoutes)
app.use('/api/admin', auditLogRoutes)
app.use('/api/rescue', rescueRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/participants', participantRoutes)
app.use('/api/pets', petRoutes)
app.use('/api/pets', petImageRoutes)
app.use('/api/ratings', ratingRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/feature-flags', featureFlagRoutes)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!')
  AuditLogger.logAction('Server', 'Root route accessed', 'INFO')
})

// Global error handling middleware
app.use(errorHandler)
AuditLogger.logAction('Server', 'Global error handler setup complete', 'INFO')

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
  AuditLogger.logAction('Server', `Server started on port ${port}`, 'INFO')
})
