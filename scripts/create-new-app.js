#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Utility function to log colored messages
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Utility function to create directories if they don't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`📁 Created directory: ${path.relative(ROOT_DIR, dirPath)}`, 'cyan');
  }
}

/**
 * Utility function to write files with logging
 */
function writeFile(filePath, content) {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  log(`📄 Created file: ${path.relative(ROOT_DIR, filePath)}`, 'green');
}

/**
 * Generate package.json for React app
 */
function generatePackageJson(appName) {
  const packageName = `@adopt-dont-shop/${appName}`;
  
  return JSON.stringify(
    {
      name: packageName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        'lint:fix': 'eslint src --ext ts,tsx --fix',
        'type-check': 'tsc --noEmit',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^6.8.1',
      },
      devDependencies: {
        '@types/jest': '^29.4.0',
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@vitejs/plugin-react': '^4.3.4',
        eslint: '^8.45.0',
        'eslint-plugin-react-hooks': '^4.6.0',
        'eslint-plugin-react-refresh': '^0.4.3',
        'identity-obj-proxy': '^3.0.0',
        jest: '^29.4.0',
        'jest-environment-jsdom': '^29.4.0',
        'jest-transform-stub': '^2.0.0',
        'ts-jest': '^29.1.0',
        typescript: '^5.0.2',
        vite: '^5.4.10',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        '@testing-library/user-event': '^14.0.0',
      },
    },
    null,
    2
  );
}

/**
 * Generate TypeScript configuration for React app
 */
function generateTsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
      },
      include: ['src'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      references: [{ path: './tsconfig.node.json' }],
    },
    null,
    2
  );
}

/**
 * Generate TypeScript Node configuration
 */
function generateTsNodeConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
      },
      include: ['vite.config.ts'],
    },
    null,
    2
  );
}

/**
 * Generate Jest configuration for React app
 */
function generateJestConfig() {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup-tests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.{test,spec}.{ts,tsx}',
    '!src/test-utils/**',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': 'jest-transform-stub',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(some-es6-module)/)',
  ],
  testTimeout: 10000,
};
`;
}

/**
 * Generate Vite configuration
 */
function generateViteConfig(appName) {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
`;
}

/**
 * Generate ESLint configuration
 */
function generateEslintConfig() {
  return JSON.stringify(
    {
      root: true,
      env: { browser: true, es2020: true },
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
      ],
      ignorePatterns: ['dist', '.eslintrc.cjs'],
      parser: '@typescript-eslint/parser',
      plugins: ['react-refresh'],
      rules: {
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    },
    null,
    2
  );
}

/**
 * Generate main App component
 */
function generateAppComponent(appName) {
  const titleCase = appName.split('.')[1] || appName;
  const title = titleCase.charAt(0).toUpperCase() + titleCase.slice(1);

  return `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>${title} Application</h1>
          <p>Welcome to your new ${title} app!</p>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div>
      <h2>Home Page</h2>
      <p>This is the home page of your ${title} application.</p>
    </div>
  );
}

function AboutPage() {
  return (
    <div>
      <h2>About Page</h2>
      <p>Learn more about the ${title} application.</p>
    </div>
  );
}

export default App;
`;
}

/**
 * Generate App CSS
 */
function generateAppCSS() {
  return `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.App {
  width: 100%;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  margin-bottom: 2rem;
  border-radius: 8px;
}

.App-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
}

.App-header p {
  margin: 0;
  font-size: 1.2rem;
  opacity: 0.8;
}

main {
  padding: 2rem;
}

main h2 {
  color: #213547;
  margin-bottom: 1rem;
}

main p {
  line-height: 1.6;
  color: #646cff;
}

@media (prefers-color-scheme: dark) {
  main h2 {
    color: #f9f9f9;
  }
  
  main p {
    color: #8b8b8b;
  }
}
`;
}

/**
 * Generate main entry point
 */
function generateMain() {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
}

/**
 * Generate index CSS
 */
function generateIndexCSS() {
  return `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: #ffffff;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
    color: #213547;
  }
}
`;
}

/**
 * Generate Vite environment types
 */
function generateViteEnv() {
  return `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
`;
}

/**
 * Generate HTML template
 */
function generateIndexHTML(appName) {
  const titleCase = appName.split('.')[1] || appName;
  const title = titleCase.charAt(0).toUpperCase() + titleCase.slice(1);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

/**
 * Generate test setup file
 */
function generateTestSetup() {
  return `import '@testing-library/jest-dom';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
});

export { mockFetch, mockLocalStorage };
`;
}

/**
 * Generate test utilities
 */
function generateTestUtils() {
  return `import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
`;
}

/**
 * Generate sample component test
 */
function generateAppTest(appName) {
  const titleCase = appName.split('.')[1] || appName;
  const title = titleCase.charAt(0).toUpperCase() + titleCase.slice(1);

  return `import React from 'react';
import { render, screen } from '../test-utils';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  // TODO: Add your component tests here
});
`;
}

/**
 * Generate Dockerfile
 */
function generateDockerfile(appName) {
  return `# Multi-stage Dockerfile for ${appName}

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;
}

/**
 * Generate nginx configuration
 */
function generateNginxConfig() {
  return `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       80;
        server_name  localhost;

        location / {
            root   /usr/share/nginx/html;
            index  index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # Enable gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
}
`;
}

/**
 * Generate README
 */
function generateReadme(appName) {
  const titleCase = appName.split('.')[1] || appName;
  const title = titleCase.charAt(0).toUpperCase() + titleCase.slice(1);

  return `# ${title} Application

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
\`\`\`bash
npm install
\`\`\`

2. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm test\` - Run tests
- \`npm run test:watch\` - Run tests in watch mode
- \`npm run test:coverage\` - Run tests with coverage
- \`npm run lint\` - Run ESLint
- \`npm run lint:fix\` - Fix ESLint errors
- \`npm run type-check\` - Run TypeScript type checking

## Project Structure

\`\`\`
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
\`\`\`

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

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

## Docker

### Development

\`\`\`bash
docker build --target development -t ${appName}:dev .
docker run -p 3000:3000 -v $(pwd):/app ${appName}:dev
\`\`\`

### Production

\`\`\`bash
docker build --target production -t ${appName}:prod .
docker run -p 80:80 ${appName}:prod
\`\`\`

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

Private - Adopt Don't Shop Platform
`;
}

/**
 * Main function to create new app
 */
async function createNewApp() {
  try {
    // Get app name from command line arguments
    const appName = process.argv[2];
    
    if (!appName) {
      log('❌ Error: Please provide an app name', 'red');
      log('Usage: npm run new-app <app-name>', 'yellow');
      log('Example: npm run new-app app.dashboard', 'yellow');
      process.exit(1);
    }

    // Validate app name format
    if (!appName.match(/^app\.[a-z]+(-[a-z]+)*$/)) {
      log('❌ Error: App name must be in format "app.name" (e.g., app.dashboard, app.user-portal)', 'red');
      process.exit(1);
    }

    const appDir = path.join(ROOT_DIR, appName);

    // Check if app already exists
    if (fs.existsSync(appDir)) {
      log(`❌ Error: App "${appName}" already exists`, 'red');
      process.exit(1);
    }

    log(`🚀 Creating new React app: ${appName}`, 'bright');
    log('', 'reset');

    // Create app directory structure
    ensureDirectoryExists(appDir);
    ensureDirectoryExists(path.join(appDir, 'src'));
    ensureDirectoryExists(path.join(appDir, 'src', 'components'));
    ensureDirectoryExists(path.join(appDir, 'src', 'pages'));
    ensureDirectoryExists(path.join(appDir, 'src', 'hooks'));
    ensureDirectoryExists(path.join(appDir, 'src', 'services'));
    ensureDirectoryExists(path.join(appDir, 'src', 'utils'));
    ensureDirectoryExists(path.join(appDir, 'src', 'types'));
    ensureDirectoryExists(path.join(appDir, 'src', 'test-utils'));
    ensureDirectoryExists(path.join(appDir, 'src', '__tests__'));
    ensureDirectoryExists(path.join(appDir, 'public'));

    // Generate and write files
    log('📝 Generating configuration files...', 'blue');
    writeFile(path.join(appDir, 'package.json'), generatePackageJson(appName));
    writeFile(path.join(appDir, 'tsconfig.json'), generateTsConfig());
    writeFile(path.join(appDir, 'tsconfig.node.json'), generateTsNodeConfig());
    writeFile(path.join(appDir, 'jest.config.cjs'), generateJestConfig());
    writeFile(path.join(appDir, 'vite.config.ts'), generateViteConfig(appName));
    writeFile(path.join(appDir, '.eslintrc.cjs'), generateEslintConfig());
    
    log('📝 Generating application files...', 'blue');
    writeFile(path.join(appDir, 'index.html'), generateIndexHTML(appName));
    writeFile(path.join(appDir, 'src', 'main.tsx'), generateMain());
    writeFile(path.join(appDir, 'src', 'App.tsx'), generateAppComponent(appName));
    writeFile(path.join(appDir, 'src', 'App.css'), generateAppCSS());
    writeFile(path.join(appDir, 'src', 'index.css'), generateIndexCSS());
    writeFile(path.join(appDir, 'src', 'vite-env.d.ts'), generateViteEnv());
    
    log('📝 Generating test files...', 'blue');
    writeFile(path.join(appDir, 'src', 'test-utils', 'setup-tests.ts'), generateTestSetup());
    writeFile(path.join(appDir, 'src', 'test-utils', 'index.tsx'), generateTestUtils());
    writeFile(path.join(appDir, 'src', '__tests__', 'App.test.tsx'), generateAppTest(appName));
    
    log('📝 Generating Docker files...', 'blue');
    writeFile(path.join(appDir, 'Dockerfile'), generateDockerfile(appName));
    writeFile(path.join(appDir, 'nginx.conf'), generateNginxConfig());
    
    writeFile(path.join(appDir, 'README.md'), generateReadme(appName));

    log('', 'reset');
    log('📦 Installing dependencies...', 'blue');
    
    // Install dependencies
    process.chdir(appDir);
    await execAsync('npm install');

    log('', 'reset');
    log('🧪 Running initial tests...', 'blue');
    
    // Run tests to verify everything works
    try {
      await execAsync('npm test -- --passWithNoTests');
      log('✅ All tests pass!', 'green');
    } catch (error) {
      log('⚠️  Tests setup complete but some tests may need adjustment', 'yellow');
    }

    // Update workspace package.json
    const workspacePackagePath = path.join(ROOT_DIR, 'package.json');
    if (fs.existsSync(workspacePackagePath)) {
      const workspacePackage = JSON.parse(fs.readFileSync(workspacePackagePath, 'utf8'));
      if (workspacePackage.workspaces && !workspacePackage.workspaces.includes(appName)) {
        workspacePackage.workspaces.push(appName);
        workspacePackage.workspaces.sort();
        fs.writeFileSync(workspacePackagePath, JSON.stringify(workspacePackage, null, 2));
        log(`📄 Updated workspace package.json to include ${appName}`, 'green');
      }
    }

    log('', 'reset');
    log('🎉 Success!', 'green');
    log(`✨ Created React app: ${appName}`, 'bright');
    log('', 'reset');
    log('📋 Next steps:', 'cyan');
    log(`   cd ${appName}`, 'reset');
    log(`   npm run dev`, 'reset');
    log('', 'reset');
    log('🧪 Testing commands:', 'cyan');
    log(`   npm test           # Run tests`, 'reset');
    log(`   npm run test:watch # Run tests in watch mode`, 'reset');
    log(`   npm run test:coverage # Run tests with coverage`, 'reset');
    log('', 'reset');
    log('🔧 Development commands:', 'cyan');
    log(`   npm run dev        # Start development server`, 'reset');
    log(`   npm run build      # Build for production`, 'reset');
    log(`   npm run lint       # Run linting`, 'reset');

  } catch (error) {
    log('❌ Error creating app:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Run the script
createNewApp();
