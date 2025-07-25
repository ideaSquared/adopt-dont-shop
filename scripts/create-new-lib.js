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
 * Generate package.json for the new library
 */
function generatePackageJson(libName, libDescription) {
  return JSON.stringify(
    {
      name: `@adopt-dont-shop/lib-${libName}`,
      version: '1.0.0',
      description: libDescription,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      },
      files: ['dist', 'README.md'],
      scripts: {
        build: 'tsc',
        dev: 'tsc --watch',
        clean: 'rm -rf dist',
        test: 'jest',
        'test:watch': 'jest --watch',
        'test:coverage': 'jest --coverage',
        lint: 'eslint src --ext ts',
        'lint:fix': 'eslint src --ext ts --fix',
        'type-check': 'tsc --noEmit',
        prepublishOnly: 'npm run clean && npm run build',
      },
      keywords: ['pet-adoption', 'library', 'typescript', 'react'],
      author: "Adopt Don't Shop Team",
      license: 'MIT',
      dependencies: {
        '@types/node': '^20.0.0',
      },
      devDependencies: {
        '@typescript-eslint/eslint-plugin': '^7.0.0',
        '@typescript-eslint/parser': '^7.0.0',
        '@types/jest': '^29.4.0',
        eslint: '^8.57.0',
        'eslint-config-prettier': '^9.1.0',
        'eslint-plugin-prettier': '^5.1.3',
        jest: '^29.4.0',
        prettier: '^3.2.5',
        'ts-jest': '^29.1.0',
        typescript: '^5.4.5',
      },
      peerDependencies: {
        typescript: '^5.0.0',
      },
      repository: {
        type: 'git',
        url: 'git+https://github.com/ParagonJenko/pet-adoption-react.git',
        directory: `lib.${libName}`,
      },
      bugs: {
        url: 'https://github.com/ParagonJenko/pet-adoption-react/issues',
      },
      homepage: `https://github.com/ParagonJenko/pet-adoption-react/tree/main/lib.${libName}#readme`,
    },
    null,
    2
  );
}

/**
 * Generate TypeScript configuration
 */
function generateTsConfig() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        outDir: './dist',
        rootDir: './src',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: false,
        incremental: true,
        tsBuildInfoFile: './dist/.tsbuildinfo',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
    },
    null,
    2
  );
}

/**
 * Generate Jest configuration
 */
function generateJestConfig() {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup-tests.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test-utils/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
};
`;
}

/**
 * Generate ESLint configuration
 */
function generateEslintConfig() {
  return JSON.stringify(
    {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      plugins: ['@typescript-eslint', 'prettier'],
      extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
      env: {
        node: true,
        es2020: true,
        jest: true,
      },
      rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/prefer-const': 'error',
      },
      ignorePatterns: ['dist/', 'node_modules/', '*.js'],
    },
    null,
    2
  );
}

/**
 * Generate Prettier configuration
 */
function generatePrettierConfig() {
  return JSON.stringify(
    {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      endOfLine: 'crlf',
    },
    null,
    2
  );
}

/**
 * Generate main index.ts file
 */
function generateIndexFile(libName) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  return `// Main exports for @adopt-dont-shop/lib-${libName}
export { ${serviceName} } from './services/${libName}-service';
export type {
  ${serviceName}Config,
  ${serviceName}Options,
} from './types';
export * from './types';
`;
}

/**
 * Generate types file
 */
function generateTypesFile(libName) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  return `/**
 * Configuration options for ${serviceName}
 */
export interface ${serviceName}Config {
  /**
   * API base URL
   */
  apiUrl?: string;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
  
  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for ${serviceName} operations
 */
export interface ${serviceName}Options {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to use caching
   */
  useCache?: boolean;
  
  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
`;
}

/**
 * Generate service file
 */
function generateServiceFile(libName) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  return `import { ${serviceName}Config, ${serviceName}Options, BaseResponse, ErrorResponse } from '../types';

/**
 * ${serviceName} - Handles ${libName} operations
 */
export class ${serviceName} {
  private config: Required<${serviceName}Config>;
  private cache: Map<string, unknown> = new Map();

  constructor(config: ${serviceName}Config = {}) {
    this.config = {
      apiUrl: process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000',
      debug: process.env.NODE_ENV === 'development',
      headers: {},
      ...config,
    };

    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} initialized with config:\`, this.config);
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<${serviceName}Config>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} config updated:\`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ${serviceName}Config {
    return { ...this.config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    
    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} cache cleared\`);
    }
  }

  /**
   * Example method - customize based on your library's purpose
   */
  async exampleMethod(
    data: Record<string, unknown>,
    options: ${serviceName}Options = {}
  ): Promise<BaseResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first if enabled
      const cacheKey = \`example_\${JSON.stringify(data)}\`;
      if (options.useCache && this.cache.has(cacheKey)) {
        if (this.config.debug) {
          console.log(\`\${${serviceName}.name} cache hit for key:\`, cacheKey);
        }
        return this.cache.get(cacheKey) as BaseResponse;
      }

      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response: BaseResponse = {
        data: { processed: data, timestamp: new Date().toISOString() },
        success: true,
        message: 'Example operation completed successfully',
        timestamp: new Date().toISOString(),
      };

      // Cache the response if enabled
      if (options.useCache) {
        this.cache.set(cacheKey, response);
      }

      if (this.config.debug) {
        const duration = Date.now() - startTime;
        console.log(\`\${${serviceName}.name} exampleMethod completed in \${duration}ms\`);
      }

      return response;
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXAMPLE_ERROR',
        timestamp: new Date().toISOString(),
      };

      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} exampleMethod failed:\`, errorResponse);
      }

      throw errorResponse;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Implement actual health check logic
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} health check failed:\`, error);
      }
      return false;
    }
  }
}

// Export singleton instance
export const ${camelCaseName}Service = new ${serviceName}();
`;
}

/**
 * Generate test file
 */
function generateTestFile(libName) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  return `import { ${serviceName} } from '../${libName}-service';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    service = new ${serviceName}({
      debug: false,
    });
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });
  });

  // TODO: Add your tests here
});
`;
}

/**
 * Generate test setup file
 */
function generateTestSetup() {
  return `// Test setup file for Jest
// This file is automatically loaded before each test file

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

// Mock global localStorage (for Node.js environment)
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.localStorage (for jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

// Mock console methods to reduce noise in tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities available in all tests
global.mockFetch = mockFetch;
global.mockLocalStorage = mockLocalStorage;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
});

// Export for use in individual test files if needed
export { mockFetch, mockLocalStorage };
`;
}

/**
 * Generate Dockerfile for development
 */
function generateDockerfile(libName) {
  return `# Multi-stage Dockerfile for lib.${libName}

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the library
RUN npm run build

# Create a volume for the built library
VOLUME ["/app/dist"]

# Default command for development
CMD ["npm", "run", "dev"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the library
RUN npm run build && npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built library and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Expose any necessary ports (if applicable)
# EXPOSE 3000

# Default command
CMD ["node", "dist/index.js"]
`;
}

/**
 * Generate docker-compose.lib.yml for library development
 */
function generateLibDockerCompose(libName) {
  return `# Docker Compose for lib.${libName} development
services:
  lib-${libName}:
    build:
      context: ./lib.${libName}
      dockerfile: Dockerfile
      target: development
    volumes:
      - ./lib.${libName}:/app
      - /app/node_modules
      - lib_${libName.replace('-', '_')}_dist:/app/dist
    environment:
      NODE_ENV: development
    command: npm run dev

  # Example service that uses the library
  lib-${libName}-test:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./lib.${libName}:/app
      - /app/node_modules
    environment:
      NODE_ENV: test
    command: npm test
    depends_on:
      - lib-${libName}

volumes:
  lib_${libName.replace('-', '_')}_dist:
`;
}

/**
 * Generate comprehensive README.md
 */
function generateReadme(libName, libDescription) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  return `# @adopt-dont-shop/lib-${libName}

${libDescription}

## 📦 Installation

\`\`\`bash
# From the workspace root
npm install @adopt-dont-shop/lib-${libName}

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-${libName}": "workspace:*"
  }
}
\`\`\`

## 🚀 Quick Start

\`\`\`typescript
import { ${serviceName}, ${serviceName}Config } from '@adopt-dont-shop/lib-${libName}';

// Using the singleton instance
import { ${libName}Service } from '@adopt-dont-shop/lib-${libName}';

// Basic usage
const result = await ${libName}Service.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: ${serviceName}Config = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new ${serviceName}(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
\`\`\`

## 🔧 Configuration

### ${serviceName}Config

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`apiUrl\` | \`string\` | \`process.env.VITE_API_URL\` | Base API URL |
| \`debug\` | \`boolean\` | \`process.env.NODE_ENV === 'development'\` | Enable debug logging |
| \`headers\` | \`Record<string, string>\` | \`{}\` | Custom headers for requests |

### Environment Variables

\`\`\`bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
\`\`\`

## 📖 API Reference

### ${serviceName}

#### Constructor

\`\`\`typescript
new ${serviceName}(config?: ${serviceName}Config)
\`\`\`

#### Methods

##### \`exampleMethod(data, options)\`

Example method that demonstrates the library's capabilities.

\`\`\`typescript
await service.exampleMethod(
  { key: 'value' },
  { 
    timeout: 5000,
    useCache: true,
    metadata: { requestId: 'abc123' }
  }
);
\`\`\`

**Parameters:**
- \`data\` (Record<string, unknown>): Input data
- \`options\` (${serviceName}Options): Operation options

**Returns:** \`Promise<BaseResponse>\`

##### \`updateConfig(config)\`

Update the service configuration.

\`\`\`typescript
service.updateConfig({ debug: true, apiUrl: 'https://new-api.com' });
\`\`\`

##### \`getConfig()\`

Get current configuration.

\`\`\`typescript
const config = service.getConfig();
\`\`\`

##### \`clearCache()\`

Clear the internal cache.

\`\`\`typescript
service.clearCache();
\`\`\`

##### \`healthCheck()\`

Check service health.

\`\`\`typescript
const isHealthy = await service.healthCheck();
\`\`\`

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

1. **Add to package.json:**
\`\`\`json
{
  "dependencies": {
    "@adopt-dont-shop/lib-${libName}": "workspace:*"
  }
}
\`\`\`

2. **Import and use:**
\`\`\`typescript
// src/services/index.ts
export { ${libName}Service } from '@adopt-dont-shop/lib-${libName}';

// In your component
import { ${libName}Service } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await ${libName}Service.exampleMethod({ 
          component: 'MyComponent' 
        });
        setData(result.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  return <div>{/* Your JSX */}</div>;
}
\`\`\`

### Node.js Backend (service.backend)

1. **Add to package.json:**
\`\`\`json
{
  "dependencies": {
    "@adopt-dont-shop/lib-${libName}": "workspace:*"
  }
}
\`\`\`

2. **Import and use:**
\`\`\`typescript
// src/services/${libName}.service.ts
import { ${serviceName} } from '@adopt-dont-shop/lib-${libName}';

export const ${camelCaseName}Service = new ${serviceName}({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { ${camelCaseName}Service } from '../services/${libName}.service';

app.get('/api/${libName}/example', async (req, res) => {
  try {
    const result = await ${camelCaseName}Service.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
\`\`\`

## 🐳 Docker Integration

### Development with Docker Compose

1. **Build the library:**
\`\`\`bash
# From workspace root
docker-compose -f docker-compose.lib.yml up lib-${libName}
\`\`\`

2. **Run tests:**
\`\`\`bash
docker-compose -f docker-compose.lib.yml run lib-${libName}-test
\`\`\`

### Using in App Containers

Add to your app's Dockerfile:

\`\`\`dockerfile
# Copy shared libraries
COPY lib.${libName} /workspace/lib.${libName}

# Install dependencies
RUN npm install @adopt-dont-shop/lib-${libName}@workspace:*
\`\`\`

### Multi-stage Build for Production

\`\`\`dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.${libName} ./lib.${libName}

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.${libName} && npm ci && npm run build
RUN cd app.client && npm ci

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./

# Copy app source
COPY app.client ./app.client

# Build app
RUN cd app.client && npm run build
\`\`\`

## 🧪 Testing

### Run Tests

\`\`\`bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
\`\`\`

### Test Structure

\`\`\`
src/
├── services/
│   ├── ${libName}-service.ts
│   └── __tests__/
│       └── ${libName}-service.test.ts
└── types/
    └── index.ts
\`\`\`

## 🏗️ Development

### Build the Library

\`\`\`bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
\`\`\`

### Code Quality

\`\`\`bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
\`\`\`

## 📁 Project Structure

\`\`\`
lib.${libName}/
├── src/
│   ├── services/
│   │   ├── ${libName}-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── ${libName}-service.test.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── docker-compose.lib.yml           # Docker compose for development
├── Dockerfile                       # Multi-stage Docker build
├── jest.config.js                   # Jest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
\`\`\`

## 🔗 Integration Examples

### With Other Libraries

\`\`\`typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { ${libName}Service } from '@adopt-dont-shop/lib-${libName}';

// Configure with shared dependencies
${libName}Service.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    'Authorization': \`Bearer \${authService.getToken()}\`,
  },
});
\`\`\`

### Error Handling

\`\`\`typescript
import { ${libName}Service, ErrorResponse } from '@adopt-dont-shop/lib-${libName}';

try {
  const result = await ${libName}Service.exampleMethod(data);
  // Handle success
} catch (error) {
  const errorResponse = error as ErrorResponse;
  console.error('Error:', errorResponse.error);
  console.error('Code:', errorResponse.code);
  console.error('Details:', errorResponse.details);
}
\`\`\`

## 🚀 Deployment

### NPM Package (if publishing externally)

\`\`\`bash
# Build and test
npm run build
npm run test

# Publish
npm publish
\`\`\`

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

\`\`\`json
{
  "dependencies": {
    "@adopt-dont-shop/lib-${libName}": "workspace:*"
  }
}
\`\`\`

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run \`npm run build\` to ensure it builds correctly
4. Run \`npm test\` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: \`npm run build\`
   - Check workspace dependencies are installed: \`npm install\`

2. **Type errors**
   - Run type checking: \`npm run type-check\`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: \`npm run clean && npm run build\`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

\`\`\`typescript
${libName}Service.updateConfig({ debug: true });
\`\`\`

Or set environment variable:
\`\`\`bash
NODE_ENV=development
\`\`\`
`;
}

/**
 * Update root package.json to include new library
 */
async function updateRootPackageJson(libName) {
  const packageJsonPath = path.join(ROOT_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add to workspaces if not already present
  const libWorkspace = `lib.${libName}`;
  if (!packageJson.workspaces.includes(libWorkspace)) {
    packageJson.workspaces.push(libWorkspace);
    packageJson.workspaces.sort();
  }

  // Add new scripts for the library
  packageJson.scripts[`dev:lib-${libName}`] =
    `turbo run dev --filter=@adopt-dont-shop/lib-${libName}`;
  packageJson.scripts[`build:lib-${libName}`] =
    `turbo run build --filter=@adopt-dont-shop/lib-${libName}`;
  packageJson.scripts[`test:lib-${libName}`] =
    `turbo run test --filter=@adopt-dont-shop/lib-${libName}`;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  log(`📦 Updated root package.json with lib.${libName}`, 'green');
}

/**
 * Update docker-compose.yml to include library service
 */
async function updateDockerCompose(libName) {
  const dockerComposePath = path.join(ROOT_DIR, 'docker-compose.yml');

  if (fs.existsSync(dockerComposePath)) {
    let dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');

    // Add library service at the end, before volumes section
    const libService = `
  # Library: lib.${libName}
  lib-${libName}:
    build:
      context: ./lib.${libName}
      dockerfile: Dockerfile
      target: development
    volumes:
      - ./lib.${libName}:/app
      - /app/node_modules
      - lib_${libName.replace('-', '_')}_dist:/app/dist
    environment:
      NODE_ENV: \${NODE_ENV:-development}
    command: npm run dev

`;

    // Find the volumes section and insert before it
    const volumesIndex = dockerComposeContent.indexOf('\nvolumes:');
    if (volumesIndex !== -1) {
      dockerComposeContent =
        dockerComposeContent.slice(0, volumesIndex) +
        libService +
        dockerComposeContent.slice(volumesIndex);
    } else {
      // If no volumes section, add at the end
      dockerComposeContent += libService;
    }

    // Add volume definition
    const volumeDefinition = `  lib_${libName.replace('-', '_')}_dist:\n`;
    if (dockerComposeContent.includes('volumes:')) {
      dockerComposeContent += volumeDefinition;
    } else {
      dockerComposeContent += `\nvolumes:\n${volumeDefinition}`;
    }

    fs.writeFileSync(dockerComposePath, dockerComposeContent);
    log(`🐳 Updated docker-compose.yml with lib.${libName} service`, 'green');
  }
}

/**
 * Install dependencies for the new library
 */
async function installDependencies(libDir) {
  try {
    log('📦 Installing dependencies...', 'yellow');
    await execAsync('npm install', { cwd: libDir });
    log('✅ Dependencies installed successfully', 'green');
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`, 'red');
    log('💡 You can install them manually by running: npm install', 'yellow');
  }
}

/**
 * Main function to create a new library
 */
async function createNewLibrary() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('❌ Please provide a library name', 'red');
    log('Usage: npm run new-lib <library-name> [description]', 'yellow');
    log('Example: npm run new-lib chat "Real-time chat functionality"', 'cyan');
    process.exit(1);
  }

  const libName = args[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const libDescription = args[1] || `Shared ${libName} functionality for the pet adoption platform`;

  if (!libName.match(/^[a-z][a-z0-9-]*$/)) {
    log('❌ Invalid library name. Use lowercase letters, numbers, and hyphens only.', 'red');
    process.exit(1);
  }

  const libDir = path.join(ROOT_DIR, `lib.${libName}`);

  // Check if library already exists
  if (fs.existsSync(libDir)) {
    log(`❌ Library lib.${libName} already exists!`, 'red');
    process.exit(1);
  }

  log(`🚀 Creating new library: lib.${libName}`, 'bright');
  log(`📝 Description: ${libDescription}`, 'cyan');
  log('', 'reset');

  try {
    // Create directory structure
    ensureDirectoryExists(libDir);
    ensureDirectoryExists(path.join(libDir, 'src', 'services', '__tests__'));
    ensureDirectoryExists(path.join(libDir, 'src', 'types'));
    ensureDirectoryExists(path.join(libDir, 'src', 'test-utils'));

    // Generate all files
    writeFile(path.join(libDir, 'package.json'), generatePackageJson(libName, libDescription));
    writeFile(path.join(libDir, 'tsconfig.json'), generateTsConfig());
    writeFile(path.join(libDir, 'jest.config.cjs'), generateJestConfig());
    writeFile(path.join(libDir, '.eslintrc.json'), generateEslintConfig());
    writeFile(path.join(libDir, '.prettierrc.json'), generatePrettierConfig());
    writeFile(path.join(libDir, 'src', 'index.ts'), generateIndexFile(libName));
    writeFile(path.join(libDir, 'src', 'types', 'index.ts'), generateTypesFile(libName));
    writeFile(
      path.join(libDir, 'src', 'services', `${libName}-service.ts`),
      generateServiceFile(libName)
    );
    writeFile(
      path.join(libDir, 'src', 'services', '__tests__', `${libName}-service.test.ts`),
      generateTestFile(libName)
    );
    writeFile(
      path.join(libDir, 'src', 'test-utils', 'setup-tests.ts'),
      generateTestSetup()
    );
    writeFile(path.join(libDir, 'Dockerfile'), generateDockerfile(libName));
    writeFile(path.join(libDir, 'docker-compose.lib.yml'), generateLibDockerCompose(libName));
    writeFile(path.join(libDir, 'README.md'), generateReadme(libName, libDescription));

    // Update workspace configuration
    await updateRootPackageJson(libName);
    await updateDockerCompose(libName);

    // Install dependencies
    await installDependencies(libDir);

    log('', 'reset');
    log('🎉 Library created successfully!', 'green');
    log('', 'reset');
    log('📋 Next steps:', 'bright');
    log(`   1. cd lib.${libName}`, 'cyan');
    log('   2. npm run dev     # Start development build', 'cyan');
    log('   3. npm test        # Run tests', 'cyan');
    log('   4. Edit src/services/${libName}-service.ts to implement your logic', 'cyan');
    log('', 'reset');
    log('🐳 Docker commands:', 'bright');
    log(`   docker-compose -f docker-compose.lib.yml up lib-${libName}`, 'cyan');
    log(`   docker-compose run lib-${libName}-test`, 'cyan');
    log('', 'reset');
    log('📦 Use in apps:', 'bright');
    log('   Add to package.json dependencies:', 'cyan');
    log(`   "@adopt-dont-shop/lib-${libName}": "workspace:*"`, 'cyan');
    log('', 'reset');
    log('📖 Documentation:', 'bright');
    log(`   See lib.${libName}/README.md for detailed usage instructions`, 'cyan');
  } catch (error) {
    log(`❌ Error creating library: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
createNewLibrary().catch(error => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
