// hooks/useStats.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const useStats = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		const fetchStats = async () => {
			setLoading(true);
			try {
				const response = await axios.get(
					`${
						import.meta.env.VITE_API_BASE_URL
					}/admin/stats?from=2024-01-01&to=2024-12-31`
				);
				setStats(response.data);
			} catch (error) {
				console.error('Error fetching stats', error);
				setError('Failed to fetch statistics');
			}
			setLoading(false);
		};

		fetchStats();
	}, []);

	return { stats, loading, error };
};

export default useStats;
