# Pet Adoption Platform Backend

This is the backend service for the Pet Adoption Platform, built with Express.js, TypeScript, and PostgreSQL.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- TypeScript (v4.5 or higher)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── Models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/         # TypeScript types/interfaces
│   ├── utils/         # Utility functions
│   └── config/        # Configuration files
├── __tests__/         # Test files
└── dist/              # Compiled JavaScript files
```

## 🔑 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## 📝 API Documentation

### API Routes Overview

| Method | Endpoint                                 | Description                  | Auth Required | Role Required              |
| ------ | ---------------------------------------- | ---------------------------- | ------------- | -------------------------- |
| POST   | /api/auth/login                          | User login                   | No            | None                       |
| POST   | /api/auth/register                       | User registration            | No            | None                       |
| GET    | /api/pets                                | Get all pets                 | No            | None                       |
| GET    | /api/pets/:id                            | Get pet by ID                | No            | None                       |
| POST   | /api/pets                                | Create new pet listing       | Yes           | rescue                     |
| PUT    | /api/pets/:id                            | Update pet listing           | Yes           | rescue                     |
| DELETE | /api/pets/:id                            | Delete pet listing           | Yes           | rescue                     |
| POST   | /api/applications                        | Submit adoption application  | Yes           | user                       |
| GET    | /api/applications                        | Get all applications         | Yes           | rescue                     |
| PUT    | /api/applications/:id                    | Update application status    | Yes           | rescue                     |
| GET    | /api/rescue                              | Get rescue organization info | No            | None                       |
| POST   | /api/rescue                              | Create rescue organization   | Yes           | admin                      |
| GET    | /api/messages                            | Get user messages            | Yes           | Any                        |
| POST   | /api/messages                            | Send a message               | Yes           | Any                        |
| GET    | /api/conversations                       | Get user conversations       | Yes           | Any                        |
| POST   | /api/ratings                             | Submit a rating              | Yes           | user                       |
| GET    | /api/admin/audit-logs                    | Get audit logs               | Yes           | admin                      |
| GET    | /api/dashboard/rescue                    | Get rescue dashboard data    | Yes           | staff                      |
| GET    | /api/dashboard/admin                     | Get admin dashboard data     | Yes           | admin                      |
| GET    | /api/question-config/rescue/:id          | Get rescue question configs  | Yes           | rescue_manager/staff/admin |
| PUT    | /api/question-config/:id                 | Update question config       | Yes           | rescue_manager             |
| PUT    | /api/question-config/rescue/:id/bulk     | Bulk update question configs | Yes           | rescue_manager             |
| POST   | /api/question-config/rescue/:id/validate | Validate application answers | Yes           | Any                        |

## 🧪 Testing

Run tests using:

```bash
npm test
```

## 🔒 Environment Variables

Required environment variables:

- `PORT`: Server port (default: 5000) - The API will be available at http://localhost:5000
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `NODE_ENV`: Environment (development/production)
- `AWS_S3_BUCKET`: S3 bucket for image storage
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

## 📦 Dependencies

Major dependencies include:

- Express.js
- TypeScript
- Sequelize
- JWT
- AWS SDK
- Jest

## 🛠️ Development

1. Follow coding standards (ESLint + Prettier)
2. Write tests for new features
3. Update documentation when changing API
4. Use conventional commits

## 📄 License

This project is licensed under the MIT License.
