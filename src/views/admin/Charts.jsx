import React, { useState, useEffect } from 'react';
import {
	Container,
	Alert,
	Spinner,
	Row,
	Col,
	Form,
	Button,
	Card,
} from 'react-bootstrap';
import { Line, Bar } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import 'chart.js/auto';
import { format } from 'date-fns';

const Charts = () => {
	const [stats, setStats] = useState({});
	const [totalCounts, setTotalCounts] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [dateRange, setDateRange] = useState([
		new Date('2024-01-01'),
		new Date('2024-12-31'),
	]);
	const [tempDateRange, setTempDateRange] = useState(dateRange);

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

	const fetchData = async () => {
		setLoading(true);
		const formattedStartDate = format(dateRange[0], 'yyyy-MM-dd');
		const formattedEndDate = format(dateRange[1], 'yyyy-MM-dd');
		const queryParams = `from=${formattedStartDate}&to=${formattedEndDate}`;

		try {
			const statsResponse = await fetch(
				`${API_BASE_URL}/admin/stats-created-count?${queryParams}`,
				{
					method: 'GET',
					credentials: 'include',
				}
			);

			const totalStatsResponse = await fetch(
				`${API_BASE_URL}/admin/stats-total-count`,
				{
					method: 'GET',
					credentials: 'include',
				}
			);

			if (!statsResponse.ok && !totalStatsResponse.ok) {
				throw new Error('Network response was not ok');
			}

			const statsData = await statsResponse.json();
			const totalStatsData = await totalStatsResponse.json();
			setStats(statsData);
			setTotalCounts(totalStatsData);
		} catch (error) {
			console.error('Error fetching data:', error);
			setError('Failed to fetch data.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [dateRange]); // This ensures fetchData is called every time the date range changes

	const chartOptions = {
		scales: {
			y: {
				beginAtZero: true,
				ticks: {
					stepSize: 1,
					callback: function (value) {
						if (value % 1 === 0) {
							return value;
						}
					},
				},
			},
		},
	};

	if (loading) {
		return (
			<Container fluid>
				<Spinner animation='border' role='status'>
					<span className='visually-hidden'>Loading...</span>
				</Spinner>
			</Container>
		);
	}

	if (error) {
		return (
			<Container fluid>
				<Alert variant='danger'>{error}</Alert>
			</Container>
		);
	}

	const combinedData = {
		labels: Array.from(
			new Set(
				Object.keys(stats).flatMap((key) =>
					stats[key].map((data) => `Week ${data.week}`)
				)
			)
		),
		datasets: Object.keys(stats).map((key, idx) => ({
			label: key.charAt(0).toUpperCase() + key.slice(1),
			data: stats[key].map((data) => data.count),
			borderColor: `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${
				Math.random() * 255
			})`,
			backgroundColor: `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
				Math.random() * 255
			}, 0.5)`,
			type: 'bar',
			// type: idx % 2 === 0 ? 'line' : 'bar', // Alternate types for visibility
		})),
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		setDateRange(tempDateRange);
	};

	return (
		<Container fluid>
			<h1 className='mb-4'>Charts</h1>
			<Form onSubmit={handleSubmit}>
				<Form.Group className='mb-3 d-flex align-items-center'>
					<Form.Label className='me-2'>Date Range: </Form.Label>
					<DatePicker
						selectsRange={true}
						startDate={tempDateRange[0]}
						endDate={tempDateRange[1]}
						onChange={(update) => setTempDateRange(update)}
						dateFormat='yyyy-MM-dd'
						className='form-control me-2'
						style={{ width: 'auto', flexGrow: '1' }} // Ensure DatePicker takes only needed space and grows with the container
					/>
					<Button type='submit' variant='secondary' className='mx-2'>
						Set Date Range
					</Button>
				</Form.Group>
			</Form>

			<Row className='mb-4'>
				{Object.entries(totalCounts).map(([key, values]) => (
					<Col md={4} key={key}>
						<Card>
							<Card.Body>
								<Card.Title>
									{key.charAt(0).toUpperCase() + key.slice(1)}
								</Card.Title>
								{Array.isArray(values) ? (
									values.map((item, index) => (
										<Card.Text key={index}>
											Week {item.week}: {item.count}
										</Card.Text>
									))
								) : (
									<Card.Text>{values}</Card.Text>
								)}
							</Card.Body>
						</Card>
					</Col>
				))}
			</Row>

			<Row>
				<h2 className='mb-4'>Combined Charts</h2>
				<Col md={12}>
					<Bar data={combinedData} options={chartOptions} />
				</Col>
			</Row>

			{Object.keys(stats).map((key) => (
				<Row key={key} className='mb-4'>
					<h2>{key.charAt(0).toUpperCase() + key.slice(1)}</h2>
					<Col md={6}>
						<Line
							data={{
								labels: stats[key]?.map((data) => `Week ${data.week}`),
								datasets: [
									{
										label: key,
										data: stats[key]?.map((data) => data.count),
										borderColor: `rgb(${Math.random() * 255}, ${
											Math.random() * 255
										}, ${Math.random() * 255})`,
										backgroundColor: `rgba(${Math.random() * 255}, ${
											Math.random() * 255
										}, ${Math.random() * 255}, 0.5)`,
									},
								],
							}}
							options={chartOptions}
						/>
					</Col>
					<Col md={6}>
						<Bar
							data={{
								labels: stats[key]?.map((data) => `Week ${data.week}`),
								datasets: [
									{
										label: key,
										data: stats[key]?.map((data) => data.count),
										backgroundColor: `rgba(${Math.random() * 255}, ${
											Math.random() * 255
										}, ${Math.random() * 255}, 0.5)`,
									},
								],
							}}
							options={chartOptions}
						/>
					</Col>
				</Row>
			))}
		</Container>
	);
};

export default Charts;
