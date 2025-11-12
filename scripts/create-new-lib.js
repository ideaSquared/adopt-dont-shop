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
function generatePackageJson(libName, libDescription, useLibApi = false, libType = 'service') {
  const isUtility = libType === 'utility';

  const packageConfig = {
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
      lint: isUtility ? 'eslint src --ext ts,tsx' : 'eslint src --ext ts',
      'lint:fix': isUtility ? 'eslint src --ext ts,tsx --fix' : 'eslint src --ext ts --fix',
      'type-check': 'tsc --noEmit',
      prepublishOnly: 'npm run clean && npm run build',
    },
    keywords: [
      'pet-adoption',
      'library',
      'typescript',
      ...(isUtility ? ['react', 'components'] : []),
    ],
    author: "Adopt Don't Shop Team",
    license: 'MIT',
    dependencies: {
      '@types/node': '^20.0.0',
      ...(useLibApi ? { '@adopt-dont-shop/lib-api': 'file:../lib.api' } : {}),
      ...(isUtility
        ? {
            react: '^18.2.0',
            'styled-components': '^6.1.8',
          }
        : {}),
    },
    devDependencies: {
      '@typescript-eslint/eslint-plugin': '^7.0.0',
      '@typescript-eslint/parser': '^7.0.0',
      '@types/jest': '^29.4.0',
      ...(isUtility
        ? {
            '@types/react': '^18.2.0',
            '@types/styled-components': '^5.1.26',
          }
        : {}),
      eslint: '^8.57.0',
      'eslint-config-prettier': '^9.1.0',
      'eslint-plugin-prettier': '^5.1.3',
      jest: '^29.4.0',
      'jest-environment-jsdom': '^29.4.0',
      prettier: '^3.2.5',
      'ts-jest': '^29.1.0',
      typescript: '^5.4.5',
    },
    peerDependencies: {
      typescript: '^5.0.0',
      ...(isUtility
        ? {
            react: '>=18.0.0',
            'styled-components': '>=5.0.0',
          }
        : {}),
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
  };

  return JSON.stringify(packageConfig, null, 2);
}

/**
 * Generate TypeScript configuration
 */
function generateTsConfig(libType = 'service') {
  const isUtility = libType === 'utility';

  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        ...(isUtility ? { lib: ['DOM', 'DOM.Iterable', 'ES6'] } : {}),
        ...(isUtility ? { allowJs: false } : {}),
        module: 'ESNext',
        moduleResolution: isUtility ? 'bundler' : 'node',
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
        ...(isUtility ? { jsx: 'react-jsx' } : {}),
        incremental: true,
        tsBuildInfoFile: './dist/.tsbuildinfo',
      },
      include: ['src/**/*'],
      exclude: [
        'node_modules',
        'dist',
        '**/*.test.ts',
        ...(isUtility ? ['**/*.test.tsx'] : []),
        '**/*.spec.ts',
      ],
    },
    null,
    2
  );
}

/**
 * Generate Jest configuration
 */
function generateJestConfig(useLibApi = false, libType = 'service') {
  const isUtility = libType === 'utility';

  const jestConfig = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: [
      '**/__tests__/**/*.test.ts',
      '**/?(*.)+(spec|test).ts',
      ...(isUtility ? ['**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).tsx'] : []),
    ],
    transform: {
      '^.+\\.ts$': 'ts-jest',
      ...(isUtility ? { '^.+\\.tsx$': 'ts-jest' } : {}),
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

  // Add moduleNameMapper for lib.api integration
  if (useLibApi) {
    jestConfig.moduleNameMapper = {
      '^lib\\.api$': '<rootDir>/../lib.api/src',
    };
  }

  return `module.exports = ${JSON.stringify(jestConfig, null, 2)};`;
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
function generateIndexFile(libName, libType = 'service') {
  if (libType === 'utility') {
    return `// Main exports for @adopt-dont-shop/lib-${libName}

// Re-export all components
export * from './components';

// Re-export all hooks  
export * from './hooks';

// Re-export all utilities
export * from './utils';
`;
  }

  // Service library (original behavior)
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
function generateServiceFile(libName, useLibApi = false) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  if (useLibApi) {
    return `import { ApiService } from '@adopt-dont-shop/lib-api';
import { ${serviceName}Config } from '../types';

/**
 * ${serviceName} - Handles ${libName} operations
 */
export class ${serviceName} {
  private config: ${serviceName}Config;
  private apiService: ApiService;

  constructor(
    config: Partial<${serviceName}Config> = {},
    apiService?: ApiService
  ) {
    this.config = {
      debug: false,
      ...config,
    };
    
    this.apiService = apiService || new ApiService();

    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} initialized with config:\`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ${serviceName}Config {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<${serviceName}Config>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} config updated:\`, this.config);
    }
  }

  /**
   * Example API method - customize based on your library's purpose
   * TODO: Replace with actual ${libName} functionality
   */
  public async exampleGet(id: string): Promise<any> {
    try {
      const response = await this.apiService.get(\`/api/v1/${libName}/\${id}\`);
      
      if (this.config.debug) {
        console.log(\`\${${serviceName}.name} exampleGet completed for id:\`, id);
      }
      
      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} exampleGet failed:\`, error);
      }
      throw error;
    }
  }

  /**
   * Example POST method
   * TODO: Replace with actual ${libName} functionality
   */
  public async exampleCreate(data: Record<string, unknown>): Promise<any> {
    try {
      const response = await this.apiService.post(\`/api/v1/${libName}\`, data);
      
      if (this.config.debug) {
        console.log(\`\${${serviceName}.name} exampleCreate completed\`);
      }
      
      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} exampleCreate failed:\`, error);
      }
      throw error;
    }
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Implement actual health check logic using apiService
      await this.apiService.get('/api/v1/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} health check failed:\`, error);
      }
      return false;
    }
  }
}
`;
  } else {
    return `import { ${serviceName}Config, ${serviceName}Options } from '../types';

/**
 * ${serviceName} - Handles ${libName} operations
 */
export class ${serviceName} {
  private config: ${serviceName}Config;

  constructor(config: Partial<${serviceName}Config> = {}) {
    this.config = {
      debug: false,
      ...config,
    };

    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} initialized with config:\`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ${serviceName}Config {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<${serviceName}Config>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.debug) {
      console.log(\`\${${serviceName}.name} config updated:\`, this.config);
    }
  }

  /**
   * Example method - customize based on your library's purpose
   * TODO: Replace with actual ${libName} functionality
   */
  public async exampleMethod(
    data: Record<string, unknown>,
    _options: ${serviceName}Options = {}
  ): Promise<{ success: boolean; data: any; message?: string }> {
    try {
      if (this.config.debug) {
        console.log(\`\${${serviceName}.name} exampleMethod called with:\`, data);
      }

      // TODO: Implement your actual logic here
      const result = {
        success: true,
        data: { processed: data, timestamp: new Date().toISOString() },
        message: 'Example operation completed successfully',
      };

      if (this.config.debug) {
        console.log(\`\${${serviceName}.name} exampleMethod completed\`);
      }

      return result;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} exampleMethod failed:\`, error);
      }
      throw error;
    }
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // TODO: Implement actual health check logic
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(\`\${${serviceName}.name} health check failed:\`, error);
      }
      return false;
    }
  }
}
`;
  }
}

/**
 * Generate test file
 */
function generateTestFile(libName, useLibApi = false) {
  // Convert hyphenated name to PascalCase for class names
  const camelCaseName = libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const className = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);
  const serviceName = `${className}Service`;

  if (useLibApi) {
    return `import { ${serviceName} } from '../${libName}-service';
import { apiService } from '@adopt-dont-shop/lib-api';

// Mock lib.api
jest.mock('@adopt-dont-shop/lib-api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    fetchWithAuth: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    isAuthenticated: jest.fn(),
    updateConfig: jest.fn(),
  },
  ApiService: jest.fn().mockImplementation(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    fetchWithAuth: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    isAuthenticated: jest.fn(),
    updateConfig: jest.fn(),
  })),
}));

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    service = new ${serviceName}({
      debug: false,
    });
    
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('exampleGet', () => {
    it('should call API service get method', async () => {
      const mockResponse = { id: '123', name: 'Test' };
      const mockApiService = service['apiService'];
      mockApiService.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.exampleGet('123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/${libName}/123');
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      const mockApiService = service['apiService'];
      mockApiService.get = jest.fn().mockRejectedValue(error);

      await expect(service.exampleGet('123')).rejects.toThrow('API Error');
    });
  });

  describe('exampleCreate', () => {
    it('should call API service post method', async () => {
      const mockData = { name: 'Test' };
      const mockResponse = { id: '123', ...mockData };
      const mockApiService = service['apiService'];
      mockApiService.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.exampleCreate(mockData);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/${libName}', mockData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      const mockApiService = service['apiService'];
      mockApiService.get = jest.fn().mockResolvedValue({});

      const result = await service.healthCheck();

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/health');
      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      const mockApiService = service['apiService'];
      mockApiService.get = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  // TODO: Add more specific tests for your ${libName} functionality
});
`;
  } else {
    return `import { ${serviceName} } from '../${libName}-service';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    service = new ${serviceName}({
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true });
      expect(service.getConfig().debug).toBe(true);
    });
  });

  describe('exampleMethod', () => {
    it('should process data successfully', async () => {
      const testData = { test: 'data' };
      
      const result = await service.exampleMethod(testData);

      expect(result.success).toBe(true);
      expect(result.data.processed).toEqual(testData);
      expect(result.message).toContain('completed successfully');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error condition
      const originalMethod = service.exampleMethod;
      service.exampleMethod = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(service.exampleMethod({})).rejects.toThrow('Test error');
      
      // Restore original method
      service.exampleMethod = originalMethod;
    });
  });

  describe('healthCheck', () => {
    it('should return true by default', async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });
  });

  // TODO: Add more specific tests for your ${libName} functionality
});
`;
  }
}

/**
 * Generate test setup file
 */
function generateTestSetup() {
  return `// Test setup file for Jest
// This file is automatically loaded before each test file

// Type declarations for global variables
declare global {
  var mockFetch: jest.Mock;
  var mockLocalStorage: {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
    clear: jest.Mock;
    length: number;
    key: jest.Mock;
  };
}

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

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
(global as any).mockFetch = mockFetch;
(global as any).mockLocalStorage = mockLocalStorage;

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
 * Generate comprehensive README.md
 */
function generateReadme(libName, libDescription, useLibApi = false) {
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

## 🐳 Standalone Development

### Docker Compose for Library Testing

For isolated library development and testing:

\`\`\`bash
# Build and run the library in isolation
docker-compose -f docker-compose.lib.yml up lib-${libName}

# Run tests in Docker
docker-compose -f docker-compose.lib.yml run lib-${libName}-test
\`\`\`

### Integration with Apps

Libraries are automatically available to apps through the optimized workspace pattern in \`Dockerfile.app.optimized\`. No additional configuration needed - just add the dependency to your app's package.json.

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
├── docker-compose.lib.yml           # Standalone development
├── Dockerfile                       # Standalone container build
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
 * Generate docker-compose.lib.yml for standalone library development
 */
function generateLibDockerCompose(libName) {
  return `# Docker Compose for lib.${libName} standalone development
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

  # Test service for the library
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
 * Generate Dockerfile for standalone library development
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

# Default command
CMD ["node", "dist/index.js"]
`;
}

/**
 * Update Dockerfile.app.optimized to include new library
 */
async function updateAppOptimizedDockerfile(libName) {
  const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile.app.optimized');

  if (fs.existsSync(dockerfilePath)) {
    let dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

    // Find the section where libraries are copied
    const newLibCopy = `COPY lib.${libName}/ ./lib.${libName}/`;

    // Find the last COPY lib. line and add after it
    const libCopyRegex = /COPY lib\.[^/]+\/ \.\/lib\.[^/]+\/$/gm;
    const matches = [...dockerfileContent.matchAll(libCopyRegex)];

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const insertIndex = lastMatch.index + lastMatch[0].length;

      dockerfileContent =
        dockerfileContent.slice(0, insertIndex) +
        '\n' +
        newLibCopy +
        dockerfileContent.slice(insertIndex);

      fs.writeFileSync(dockerfilePath, dockerfileContent);
      log(`🐳 Updated Dockerfile.app.optimized with lib.${libName}`, 'green');
    } else {
      log(`⚠️  Could not find library copy section in Dockerfile.app.optimized`, 'yellow');
      log(`💡 Manually add: ${newLibCopy}`, 'cyan');
    }
  }
}

/**
 * Generate utility components index file
 */
function generateUtilityComponentsIndex(libName) {
  return `// Components for @adopt-dont-shop/lib-${libName}

// Export individual components here as you create them
// Example:
// export { MyComponent } from './MyComponent';

// Placeholder component - replace with actual components
export const ${libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, str => str.toUpperCase())}Component = () => {
  return null; // Replace with actual component implementation
};
`;
}

/**
 * Generate utility hooks index file
 */
function generateUtilityHooksIndex(libName) {
  return `// Hooks for @adopt-dont-shop/lib-${libName}

// Export individual hooks here as you create them
// Example:
// export { useMyHook } from './useMyHook';

// Placeholder hook - replace with actual hooks
export const use${libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, str => str.toUpperCase())} = () => {
  // Replace with actual hook implementation
  return {};
};
`;
}

/**
 * Generate utility utils index file
 */
function generateUtilityUtilsIndex(libName) {
  return `// Utilities for @adopt-dont-shop/lib-${libName}

// Export individual utility functions here as you create them
// Example:
// export { myUtilFunction } from './myUtilFunction';

/**
 * Placeholder utility function - replace with actual utilities
 */
export const ${libName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Utils = {
  // Add utility functions here
};
`;
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
    log(
      'Usage: npm run new-lib <library-name> [description] [--type=service|utility] [--with-api]',
      'yellow'
    );
    log('Example: npm run new-lib chat "Real-time chat functionality" --type=service', 'cyan');
    log('Example: npm run new-lib dev-tools "Development utilities" --type=utility', 'cyan');
    log('Example: npm run new-lib auth "Authentication service" --type=service --with-api', 'cyan');
    process.exit(1);
  }

  // Parse arguments
  const useLibApi = args.includes('--with-api');
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const libType = typeArg ? typeArg.split('=')[1] : 'service'; // default to service for backward compatibility

  // Validate library type
  if (!['service', 'utility'].includes(libType)) {
    log('❌ Invalid library type. Use --type=service or --type=utility', 'red');
    process.exit(1);
  }

  const filteredArgs = args.filter(arg => !arg.startsWith('--'));

  const libName = filteredArgs[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const libDescription =
    filteredArgs[1] || `Shared ${libName} functionality for the pet adoption platform`;

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
  log(`📦 Type: ${libType}`, 'magenta');
  if (useLibApi) {
    log(`🔗 With lib.api integration: enabled`, 'magenta');
  }
  log('', 'reset');

  try {
    // Create directory structure
    ensureDirectoryExists(libDir);

    // Create different directory structures based on library type
    if (libType === 'service') {
      ensureDirectoryExists(path.join(libDir, 'src', 'services', '__tests__'));
      ensureDirectoryExists(path.join(libDir, 'src', 'types'));
    } else if (libType === 'utility') {
      ensureDirectoryExists(path.join(libDir, 'src', 'components'));
      ensureDirectoryExists(path.join(libDir, 'src', 'hooks'));
      ensureDirectoryExists(path.join(libDir, 'src', 'utils'));
    }

    ensureDirectoryExists(path.join(libDir, 'src', 'test-utils'));

    // Generate all files
    writeFile(
      path.join(libDir, 'package.json'),
      generatePackageJson(libName, libDescription, useLibApi, libType)
    );
    writeFile(path.join(libDir, 'tsconfig.json'), generateTsConfig(libType));
    writeFile(path.join(libDir, 'jest.config.cjs'), generateJestConfig(useLibApi, libType));
    writeFile(path.join(libDir, '.eslintrc.json'), generateEslintConfig());
    writeFile(path.join(libDir, '.prettierrc.json'), generatePrettierConfig());
    writeFile(path.join(libDir, 'src', 'index.ts'), generateIndexFile(libName, libType));

    // Generate files based on library type
    if (libType === 'service') {
      writeFile(path.join(libDir, 'src', 'types', 'index.ts'), generateTypesFile(libName));
      writeFile(
        path.join(libDir, 'src', 'services', `${libName}-service.ts`),
        generateServiceFile(libName, useLibApi)
      );
      writeFile(
        path.join(libDir, 'src', 'services', '__tests__', `${libName}-service.test.ts`),
        generateTestFile(libName, useLibApi)
      );
    } else if (libType === 'utility') {
      // For utility libraries, we create basic component and hook stubs
      writeFile(
        path.join(libDir, 'src', 'components', 'index.ts'),
        generateUtilityComponentsIndex(libName)
      );
      writeFile(path.join(libDir, 'src', 'hooks', 'index.ts'), generateUtilityHooksIndex(libName));
      writeFile(path.join(libDir, 'src', 'utils', 'index.ts'), generateUtilityUtilsIndex(libName));
    }

    writeFile(path.join(libDir, 'src', 'test-utils', 'setup-tests.ts'), generateTestSetup());
    writeFile(path.join(libDir, 'Dockerfile'), generateDockerfile(libName));
    writeFile(path.join(libDir, 'docker-compose.lib.yml'), generateLibDockerCompose(libName));
    writeFile(path.join(libDir, 'README.md'), generateReadme(libName, libDescription, useLibApi));

    // Update workspace configuration
    await updateRootPackageJson(libName);
    await updateAppOptimizedDockerfile(libName);

    // Install dependencies
    await installDependencies(libDir);

    log('', 'reset');
    log('🎉 Library created successfully!', 'green');
    log('', 'reset');
    log('📋 Next steps:', 'bright');
    log(`   1. cd lib.${libName}`, 'cyan');
    log('   2. npm run dev     # Start development build', 'cyan');
    log('   3. npm test        # Run tests', 'cyan');

    if (libType === 'service') {
      log(`   4. Edit src/services/${libName}-service.ts to implement your logic`, 'cyan');
    } else if (libType === 'utility') {
      log('   4. Add components to src/components/', 'cyan');
      log('   5. Add hooks to src/hooks/', 'cyan');
      log('   6. Add utilities to src/utils/', 'cyan');
    }

    log('', 'reset');
    log('🐳 Standalone development:', 'bright');
    log(`   docker-compose -f lib.${libName}/docker-compose.lib.yml up`, 'cyan');
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
