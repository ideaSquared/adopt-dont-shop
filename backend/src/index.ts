import express, { Request, Response } from 'express'
import { ConnectToDatabase } from './DatabaseConnection'

const app = express()
const port = process.env.PORT || 5000

ConnectToDatabase()

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!')
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
