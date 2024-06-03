/// <reference types="vite/client" />

import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './app/App';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_APP_API_BASE_URL as string;
axios.defaults.withCredentials = true;

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(
	<React.StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</React.StrictMode>
);
