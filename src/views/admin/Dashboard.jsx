import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Container, Alert, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const Dashboard = () => {
	const [stats, setStats] = useState({
		userStats: [],
		rescueStats: [],
		petStats: [],
		conversationStats: [],
		messageStats: [],
		ratingStats: [],
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [updateMsg, setUpdateMsg] = useState('');

	useEffect(() => {
		fetchStats();
	}, []);

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

	// Collect all weeks present in any stat category
	const allWeeks = new Set();
	Object.values(stats).forEach((statList) => {
		statList.forEach((stat) => allWeeks.add(stat.week));
	});

	const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

	const data = {
		labels: sortedWeeks.map((week) => `Week ${week}`), // Create labels for each week in the sorted list
		datasets: [
			{
				label: 'User Ratings',
				data: sortedWeeks.map((week) => {
					const weekData = stats.ratingStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(255, 99, 132)', // Pink
				backgroundColor: 'rgba(255, 99, 132, 0.5)', // Transparent Pink
			},
			{
				label: 'Users Created',
				data: sortedWeeks.map((week) => {
					const weekData = stats.userStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(255, 159, 64)', // Orange
				backgroundColor: 'rgba(255, 159, 64, 0.5)', // Transparent Orange
			},
			{
				label: 'Rescues Created',
				data: sortedWeeks.map((week) => {
					const weekData = stats.rescueStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(54, 162, 235)', // Blue
				backgroundColor: 'rgba(54, 162, 235, 0.5)', // Transparent Blue
			},
			{
				label: 'Pets Created',
				data: sortedWeeks.map((week) => {
					const weekData = stats.petStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(75, 192, 192)', // Sea Green
				backgroundColor: 'rgba(75, 192, 192, 0.5)', // Transparent Sea Green
			},
			{
				label: 'Messages Sent',
				data: sortedWeeks.map((week) => {
					const weekData = stats.messageStats.find(
						(stat) => stat.week === week
					);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(153, 102, 255)', // Purple
				backgroundColor: 'rgba(153, 102, 255, 0.5)', // Transparent Purple
			},
			{
				label: 'Conversations',
				data: sortedWeeks.map((week) => {
					const weekData = stats.conversationStats.find(
						(stat) => stat.week === week
					);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(255, 205, 86)', // Yellow
				backgroundColor: 'rgba(255, 205, 86, 0.5)', // Transparent Yellow
			},
		],
	};

	return (
		<Container>
			<h1>Charts</h1>
			{error && <Alert variant='danger'>{error}</Alert>}
			{loading ? (
				<Spinner animation='border' role='status'>
					<span className='visually-hidden'>Loading...</span>
				</Spinner>
			) : (
				<>
					<Line data={data} />
				</>
			)}
			{updateMsg && <Alert variant='info'>{updateMsg}</Alert>}
		</Container>
	);
};

export default Dashboard;
