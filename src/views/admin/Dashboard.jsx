// Dashboard.js
import React, { useState } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import useStats from '../../hooks/useStats'; // Make sure the path is correct

const Dashboard = () => {
	const { stats, loading, error } = useStats();
	const [updateMsg, setUpdateMsg] = useState('');

	if (loading) {
		return (
			<Container>
				<Spinner animation='border' role='status'>
					<span className='visually-hidden'>Loading...</span>
				</Spinner>
			</Container>
		);
	}

	if (error || !stats) {
		return (
			<Container>
				<Alert variant='danger'>{error || 'No statistics available'}</Alert>
			</Container>
		);
	}

	// Collect all weeks present in any stat category
	const allWeeks = new Set();
	Object.entries(stats).forEach(([key, statList]) => {
		if (Array.isArray(statList)) {
			statList.forEach((stat) => allWeeks.add(stat.week));
		} else {
			console.error(`Expected an array for ${key}, but received:`, statList);
		}
	});

	const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

	const data = {
		labels: sortedWeeks.map((week) => `Week ${week}`),
		datasets: [
			{
				label: 'User Ratings',
				data: sortedWeeks.map((week) => {
					if (!stats || !stats.ratingStats) return 0;
					const weekData = stats.ratingStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(255, 99, 132)', // Pink
				backgroundColor: 'rgba(255, 99, 132, 0.5)', // Transparent Pink
			},
			{
				label: 'Users Created',
				data: sortedWeeks.map((week) => {
					if (!stats || !stats.userStats) return 0;
					const weekData = stats.userStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(255, 159, 64)', // Orange
				backgroundColor: 'rgba(255, 159, 64, 0.5)', // Transparent Orange
			},
			{
				label: 'Rescues Created',
				data: sortedWeeks.map((week) => {
					if (!stats || !stats.rescueStats) return 0;
					const weekData = stats.rescueStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(54, 162, 235)', // Blue
				backgroundColor: 'rgba(54, 162, 235, 0.5)', // Transparent Blue
			},
			{
				label: 'Pets Created',
				data: sortedWeeks.map((week) => {
					if (!stats || !stats.petStats) return 0;
					const weekData = stats.petStats.find((stat) => stat.week === week);
					return weekData ? weekData.count : 0;
				}),
				borderColor: 'rgb(75, 192, 192)', // Sea Green
				backgroundColor: 'rgba(75, 192, 192, 0.5)', // Transparent Sea Green
			},
			{
				label: 'Messages Sent',
				data: sortedWeeks.map((week) => {
					if (!stats || !stats.messageStats) return 0;
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
					if (!stats || !stats.conversationStats) return 0;
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
			<Line data={data} />
			{updateMsg && <Alert variant='info'>{updateMsg}</Alert>}
		</Container>
	);
};

export default Dashboard;
