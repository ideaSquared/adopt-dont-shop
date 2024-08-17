import { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
		'^.+\\.(js|jsx)$': 'babel-jest',
	},
	transformIgnorePatterns: ['/node_modules/'],
	moduleNameMapper: {
		'^@adoptdontshop/components$': '<rootDir>/src/components/index.ts',
		'^@adoptdontshop/utils/(.*)$': '<rootDir>/src/utils/$1',
		'^@adoptdontshop/hooks/(.*)$': '<rootDir>/src/hooks/$1',
		'^@adoptdontshop/libs/(.*)$': '<rootDir>/src/libs/$1',
		'^@adoptdontshop/pages/(.*)$': '<rootDir>/src/pages/$1',
		'^@adoptdontshop/services/(.*)$': '<rootDir>/src/services/$1',
		'^@adoptdontshop/store/(.*)$': '<rootDir>/src/store/$1',
		'^@adoptdontshop/styles$': '<rootDir>/src/styles',
		'^@adoptdontshop/permissions$': '<rootDir>/src/contexts/permissions',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
	},
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
