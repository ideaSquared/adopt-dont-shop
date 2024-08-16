import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	server: {
		host: true,
		port: 3001,
		watch: {
			usePolling: true,
		},
	},
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: {
			'@adoptdontshop/components': '/src/components',
			'@adoptdontshop/utils': '/src/utils',
			'@adoptdontshop/hooks': '/src/hooks',
			'@adoptdontshop/libs': '/src/libs',
			'@adoptdontshop/pages': '/src/pages',
			'@adoptdontshop/services': '/src/services',
			'@adoptdontshop/store': '/src/store',
			'@adoptdontshop/styles': '/src/styles',
			'@adoptdontshop/permissions/*': 'src/contexts/permissions/',
		},
	},
});
