import '@testing-library/jest-dom';
import React from 'react';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver;

// Mock matchMedia
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

// Mock import.meta for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000',
        NODE_ENV: 'test',
      },
    },
  },
});

// Mock environment utilities
jest.mock('./utils/env', () => ({
  isDevelopment: () => false,
  getApiBaseUrl: () => 'http://localhost:5000',
  getEnvironmentVariable: (_key: string, defaultValue?: string) => defaultValue,
}));

// Mock library dependencies
jest.mock('@adopt-dont-shop/lib-auth', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    isAuthenticated: jest.fn(() => false),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
  AuthService: jest.fn(),
}));

jest.mock('@adopt-dont-shop/lib-pets', () => ({
  PetsService: jest.fn(),
  petManagementService: {
    getPets: jest.fn(),
    getPet: jest.fn(),
    createPet: jest.fn(),
    updatePet: jest.fn(),
    deletePet: jest.fn(),
  },
}));

jest.mock('@adopt-dont-shop/lib-applications', () => ({
  ApplicationsService: jest.fn(),
}));

jest.mock('@adopt-dont-shop/lib-rescue', () => ({
  RescueService: jest.fn(),
}));

jest.mock('@adopt-dont-shop/components', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Container: ({ children, ...props }: any) => React.createElement('div', props, children),
  Card: ({ children, ...props }: any) => React.createElement('div', props, children),
  Button: ({ children, ...props }: any) => React.createElement('button', props, children),
  Text: ({ children, ...props }: any) => React.createElement('span', props, children),
  Heading: ({ children, ...props }: any) => React.createElement('h1', props, children),
}));
