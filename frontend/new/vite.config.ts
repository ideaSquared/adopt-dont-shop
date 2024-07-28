import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: {
			'@components': '/src/components',
			'@utils': '/src/utils',
			'@hooks': '/src/hooks',
			'@libs': '/src/lib',
			'@pages': '/src/pages',
			'@services': '/src/services',
			'@store': '/src/store',
			'@styles': '/src/styles',
		},
	},
	server: {
		port: 3001,
	},
});
