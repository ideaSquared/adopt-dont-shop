import '@testing-library/jest-dom';
import React from 'react';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock import.meta.env for Vite
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:5000',
    NODE_ENV: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
  },
  configurable: true,
});

// Mock environment utilities
vi.mock('./utils/env', () => ({
  isDevelopment: () => false,
  getApiBaseUrl: () => 'http://localhost:5000',
  getEnvironmentVariable: (_key: string, defaultValue?: string) => defaultValue,
}));

// Mock library dependencies
vi.mock('@adopt-dont-shop/lib-auth', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
  AuthService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib-pets', () => ({
  PetsService: vi.fn(),
  petManagementService: {
    getPets: vi.fn(),
    getPet: vi.fn(),
    createPet: vi.fn(),
    updatePet: vi.fn(),
    deletePet: vi.fn(),
  },
}));

vi.mock('@adopt-dont-shop/lib-applications', () => ({
  ApplicationsService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/lib-rescue', () => ({
  RescueService: vi.fn(),
}));

vi.mock('@adopt-dont-shop/components', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Container: ({ children, ...props }: any) => React.createElement('div', props, children),
  Card: ({ children, ...props }: any) => React.createElement('div', props, children),
  Button: ({ children, ...props }: any) => React.createElement('button', props, children),
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  Heading: ({ children, ...props }: any) => React.createElement('h1', props, children),
}));
