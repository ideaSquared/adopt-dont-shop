import React from 'react';
import ReactDOM from 'react-dom';
import { AuthProvider } from './contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './app/App';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.REACT_APP_API_BASE_URL;
axios.defaults.withCredentials = true;

ReactDOM.render(
	<React.StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</React.StrictMode>,
	document.getElementById('root')
);
