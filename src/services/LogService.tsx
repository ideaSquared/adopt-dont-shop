import axios from 'axios';

const fetchLogs = async (): Promise<any[]> => {
	const endpoint = `${import.meta.env.VITE_API_BASE_URL}/logs`;
	try {
		const { data } = await axios.get(endpoint);
		if (Array.isArray(data)) {
			return data.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
			);
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
