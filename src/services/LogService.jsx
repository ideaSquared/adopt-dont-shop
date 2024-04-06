import axios from 'axios';

// Assuming you've set axios defaults elsewhere, like in your index.js or App.js
const fetchLogs = async () => {
	const endpoint = `${import.meta.env.VITE_API_BASE_URL}/logs`;
	try {
		const { data } = await axios.get(endpoint);
		if (Array.isArray(data)) {
			return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		} else {
			console.error('Data is not an array:', data);
			return [];
		}
	} catch (error) {
		console.error('Failed to fetch logs:', error);
		throw new Error('Failed to fetch logs.');
	}
};

export const LogsService = {
	fetchLogs,
};
