import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	// test: {
	// 	globals: true, // Enable global variables like `expect`
	// 	environment: 'jsdom',
	// 	setupFiles: ['./src/setupTests.js'], // Adjust the path to your setup file
	// 	include: [
	// 		'src/tests/*.test.{js,jsx}', // Matches test files in src/components/tests
	// 		'src/**/*.test.{js,jsx}', // Matches test files anywhere in src
	// 	],
	// },
});
