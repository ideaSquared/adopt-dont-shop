[![Backend CI](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/frontend-ci.yml/badge.svg?branch=main)](https://github.com/ideaSquared/adopt-dont-shop/actions/workflows/frontend-ci.yml)

# Pet Adoption Platform

The Pet Adoption Platform is a full-stack web application designed to facilitate pet adoption, manage rescue organizations, and foster a community around pet welfare. Built with React for the frontend and Node.js for the backend, this platform offers a comprehensive suite of features including user authentication, admin dashboard, pet management, conversations, ratings, and much more.

## 🌟 Features

- **Pet Management**: List, search, and manage pet profiles
- **User Roles**: Support for users, rescue organizations, and administrators
- **Adoption Process**: Streamlined application and approval workflow
- **Messaging System**: Real-time communication between users and rescues
- **Rating System**: Feedback mechanism for rescue organizations
- **Admin Dashboard**: Comprehensive management and monitoring tools
- **Image Management**: AWS S3 integration for pet images

## 🛠️ Tech Stack

### Frontend

- React with TypeScript
- Styled Components for styling
- React Router for navigation
- Jest and React Testing Library for testing

### Backend

- Node.js with Express
- TypeScript
- PostgreSQL with Sequelize ORM
- JWT for authentication

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v16 or higher)
- npm or yarn
- Git

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/ideaSquared/pet-adoption.git
cd pet-adoption
```

2. Start the development environment:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The application will be available at:

- Frontend: http://localhost:3001
- Backend API: http://localhost:5000

### Database Management

#### Rebuild the database

```bash
docker-compose down --volumes
docker-compose up --build
```

#### Force sync and seed the database

1. Access the backend container:

```bash
docker exec -it pet-adoption-backend bash
```

2. Run the sync command:

```bash
npm run force-sync-db
```

Note: You'll need to restart the backend as initialization time is slower than the build/run of the backend container.

## 📁 Project Structure

```
pet-adoption/
├── frontend/          # React frontend application
├── backend/           # Express backend API
├── docker/           # Docker configuration files
└── docs/             # Documentation files
```

## 🧪 Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

```bash
cd backend
npm test
```

## 🔄 CI/CD

The project uses GitHub Actions for continuous integration:

- Frontend CI: Runs tests, linting, and build checks
- Backend CI: Runs tests, linting, and database migrations

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Alex Jenkinson - Founder + Developer

## 📞 Support

For support, please open an issue in the GitHub repository or contact the team at [help@ideasquared.co.uk].
