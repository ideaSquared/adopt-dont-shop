# Rescue Application

A React TypeScript application for the Adopt Don't Shop platform.

## Features

- ⚛️ React 18 with TypeScript
- 🏃‍♂️ Vite for fast development and building
- 🧪 Jest + Testing Library for comprehensive testing
- 🎨 Modern CSS with responsive design
- 📦 Component-based architecture
- 🔍 ESLint for code quality
- 🐳 Docker support for development and production

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API and external services
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── test-utils/         # Testing utilities and setup
├── __tests__/          # Test files
├── App.tsx             # Main App component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Testing

This application uses Jest with Testing Library for comprehensive testing:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **Mocking**: Automatic mocking of external dependencies
- **Coverage**: Track test coverage across the codebase

### Test Setup

The test environment includes:

- Global fetch mocking
- localStorage mocking
- React Router mocking
- Window API mocking (matchMedia, IntersectionObserver)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Docker

### Development

```bash
docker build --target development -t app.rescue:dev .
docker run -p 3000:3000 -v $(pwd):/app app.rescue:dev
```

### Production

```bash
docker build --target production -t app.rescue:prod .
docker run -p 80:80 app.rescue:prod
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Private - Adopt Don't Shop Platform
