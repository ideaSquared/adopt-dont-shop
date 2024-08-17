module.exports = {
	root: true,
	env: {
		browser: true,
		es2020: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:jsx-a11y/recommended',
		'plugin:prettier/recommended', // Integrates Prettier for code formatting
	],
	ignorePatterns: ['dist', '.eslintrc.cjs'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 2020,
		sourceType: 'module',
	},
	plugins: ['react-refresh', 'jsx-a11y', 'prettier'],
	settings: {
		react: {
			version: 'detect', // Automatically detects the React version
		},
	},
	rules: {
		'react-refresh/only-export-components': [
			'warn',
			{ allowConstantExport: true },
		],
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'prettier/prettier': 'warn', // Enforces Prettier formatting
		'react/prop-types': 'off', // Since you're using TypeScript for type checking
		'jsx-a11y/no-autofocus': 'warn', // Accessibility rule, adjust as needed
		'no-const-assignment': 'warn',
		'no-unused-vars': 'error',
		'default-case': 'error',
	},
};
