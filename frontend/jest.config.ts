import type { Config } from 'jest'

const config: Config = {
  verbose: true,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@adoptdontshop/styles$': '<rootDir>/src/styles',
    '^@adoptdontshop/permissions$': '<rootDir>/src/contexts/permissions',
    '^@adoptdontshop/libs/(.*)$': '<rootDir>/src/libs/$1',
    '^@adoptdontshop/components$': '<rootDir>/src/components/index.ts',
    '^@adoptdontshop/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@adoptdontshop/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@adoptdontshop/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@adoptdontshop/services/(.*)$': '<rootDir>/src/services/$1',
    '^@adoptdontshop/store/(.*)$': '<rootDir>/src/store/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: ['/node_modules/'],
  roots: ['<rootDir>/src'],
}

export default config
