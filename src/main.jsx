import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './app/App';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.REACT_APP_API_BASE_URL;
axios.defaults.withCredentials = true;

// Select the root container
const container = document.getElementById('root');
const root = createRoot(container);

// Initial render using React 18's createRoot
root.render(
	<React.StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</React.StrictMode>
);
