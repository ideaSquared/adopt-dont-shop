import cors from 'cors'
import dotenv from 'dotenv'
import express, { Application, Request, Response } from 'express'
import { createServer } from 'http'
import path from 'path'
import { connectToDatabase } from './DatabaseConnection'
import { auditContextMiddleware } from './middleware/auditContextMiddleware'
import adminRoutes from './routes/adminRoutes'
import coreApplicationQuestionRoutes from './routes/applicationCoreQuestionRoutes'
import rescueQuestionConfigRoutes from './routes/applicationRescueQuestionConfigRoutes'
import applicationRoutes from './routes/applicationRoutes'
import auditLogRoutes from './routes/auditLogRoutes'
import authRoutes from './routes/authRoutes'
import chatRoutes from './routes/chatRoutes'
import dashboardRoutes from './routes/dashboardRoutes'
import featureFlagRoutes from './routes/featureFlagRoutes'
import petImageRoutes from './routes/petImageRoutes'
import petRoutes from './routes/petRoutes'
import ratingRoutes from './routes/ratingRoutes'
import rescueRoutes from './routes/rescueRoutes'
import { AuditLogger } from './services/auditLogService'
import SocketService from './services/socketService'

dotenv.config()

const app: Application = express()
const server = createServer(app)

// Initialize Socket.IO
SocketService.initialize(server)

app.use(express.json())
// Middleware
AuditLogger.logAction(
  'Server',
  'Express JSON middleware setup complete',
  'INFO',
)

app.use(auditContextMiddleware)

const port = process.env.PORT || 5000

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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

app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/audit-logs', auditLogRoutes)
app.use('/api/rescue', rescueRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/pets', petRoutes)
app.use('/api/pets', petImageRoutes)
app.use('/api/ratings', ratingRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/core-questions', coreApplicationQuestionRoutes)
app.use('/api/rescue-question-configs', rescueQuestionConfigRoutes)
app.use('/api/feature-flags', featureFlagRoutes)
app.use('/api/dashboard', dashboardRoutes)
AuditLogger.logAction('Server', 'All routes setup complete', 'INFO')

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!')
  AuditLogger.logAction('Server', 'Root route accessed', 'INFO')
})

// Global error handling middleware
export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
): void {
  // Handle errors here
  AuditLogger.logAction(
    'Error',
    err.message || 'An unknown error occurred',
    'ERROR',
  )
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' })
}
AuditLogger.logAction('Server', 'Global error handler setup complete', 'INFO')

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
  AuditLogger.logAction('Server', `Server started on port ${port}`, 'INFO')
})
