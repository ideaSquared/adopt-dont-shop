#!/usr/bin/env node
/**
 * Testing Setup Script
 * Ensures all libs and apps have comprehensive testing configurations
 */

const fs = require('fs');
const path = require('path');

// Standard Jest configuration for libraries
const LIBRARY_JEST_CONFIG = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
`;

// Standard Jest configuration for React apps
const APP_JEST_CONFIG = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/test-utils/fileMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
`;

// Test utils setup for React apps
const SETUP_TESTS_CONTENT = `import '@testing-library/jest-dom';

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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
});

export { mockFetch, mockLocalStorage };
`;

const FILE_MOCK_CONTENT = `module.exports = 'test-file-stub';
`;

// Test utils for libraries
const LIBRARY_TEST_UTILS = `/**
 * Test utilities for library testing
 */

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

// Helper function to create mock responses
export const createMockResponse = (data, options = {}) => {
  const { status = 200, headers = {}, ok = status >= 200 && status < 300 } = options;
  
  return {
    ok,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
};

// Helper function to create mock errors
export const createMockError = (message, code) => {
  const error = new Error(message);
  if (code) error.code = code;
  return error;
};

export { mockFetch, mockLocalStorage };
`;

// Sample test file for services
const SAMPLE_SERVICE_TEST = `import { MockService } from '../mock-service';
import { createMockResponse, createMockError } from '../../test-utils/test-helpers';

describe('MockService', () => {
  let service: MockService;

  beforeEach(() => {
    service = new MockService();
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeDefined();
      expect(service.getConfig()).toBeDefined();
    });
  });

  describe('Core functionality', () => {
    it('should handle successful operations', async () => {
      // Add your test implementation here
      expect(true).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Add your test implementation here
      expect(true).toBe(true);
    });
  });
});
`;

// Testing dependencies for libraries
const LIBRARY_TEST_DEPS = {
  "@types/jest": "^29.4.0",
  "jest": "^29.4.0",
  "ts-jest": "^29.1.0"
};

// Testing dependencies for React apps
const APP_TEST_DEPS = {
  "@testing-library/jest-dom": "^6.4.2",
  "@testing-library/react": "^14.2.1",
  "@testing-library/user-event": "^14.5.2",
  "@types/jest": "^29.4.0",
  "identity-obj-proxy": "^3.0.0",
  "jest": "^29.4.0",
  "jest-environment-jsdom": "^29.4.0",
  "ts-jest": "^29.1.0"
};

// Test scripts for package.json
const TEST_SCRIPTS = {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:ci": "jest --coverage --watchAll=false"
};

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFileIfNotExists(filePath, content) {
  if (!fs.existsSync(filePath)) {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filePath}`);
  } else {
    console.log(`⏭️  Exists: ${filePath}`);
  }
}

function updatePackageJson(packagePath, testDeps, isApp = false) {
  if (!fs.existsSync(packagePath)) {
    console.log(\`❌ Package.json not found: \${packagePath}\`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Add test scripts
  packageJson.scripts = { ...packageJson.scripts, ...TEST_SCRIPTS };
  
  // Add testing dependencies
  packageJson.devDependencies = { ...packageJson.devDependencies, ...testDeps };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\\n');
  console.log(\`✅ Updated: \${packagePath}\`);
}

function setupLibraryTesting(libPath) {
  const libName = path.basename(libPath);
  console.log(\`\\n🔧 Setting up testing for library: \${libName}\`);

  // Jest config
  writeFileIfNotExists(
    path.join(libPath, 'jest.config.cjs'),
    LIBRARY_JEST_CONFIG
  );

  // Test utils
  writeFileIfNotExists(
    path.join(libPath, 'src', 'test-utils', 'test-helpers.ts'),
    LIBRARY_TEST_UTILS
  );

  // Sample test (only if no tests exist)
  const testsDir = path.join(libPath, 'src', '__tests__');
  if (!fs.existsSync(testsDir)) {
    ensureDirectoryExists(testsDir);
    writeFileIfNotExists(
      path.join(testsDir, 'sample.test.ts'),
      SAMPLE_SERVICE_TEST
    );
  }

  // Update package.json
  updatePackageJson(
    path.join(libPath, 'package.json'),
    LIBRARY_TEST_DEPS
  );
}

function setupAppTesting(appPath) {
  const appName = path.basename(appPath);
  console.log(\`\\n🔧 Setting up testing for app: \${appName}\`);

  // Jest config
  writeFileIfNotExists(
    path.join(appPath, 'jest.config.cjs'),
    APP_JEST_CONFIG
  );

  // Test setup file
  writeFileIfNotExists(
    path.join(appPath, 'src', 'test-utils', 'setupTests.ts'),
    SETUP_TESTS_CONTENT
  );

  // File mock
  writeFileIfNotExists(
    path.join(appPath, 'src', 'test-utils', 'fileMock.js'),
    FILE_MOCK_CONTENT
  );

  // Update package.json
  updatePackageJson(
    path.join(appPath, 'package.json'),
    APP_TEST_DEPS,
    true
  );
}

function main() {
  console.log('🚀 Setting up comprehensive testing configurations...');

  const rootDir = path.resolve(__dirname, '..');
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const projectPath = path.join(rootDir, entry.name);
      
      if (entry.name.startsWith('lib.')) {
        setupLibraryTesting(projectPath);
      } else if (entry.name.startsWith('app.')) {
        setupAppTesting(projectPath);
      }
    }
  }

  console.log('\\n✅ Testing setup complete! Run npm install in each project to install dependencies.');
}

if (require.main === module) {
  main();
}

module.exports = {
  setupLibraryTesting,
  setupAppTesting
};
