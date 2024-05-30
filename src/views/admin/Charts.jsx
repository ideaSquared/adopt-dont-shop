import React, { useState, useEffect } from 'react';
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
	}, [dateRange]);

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
			<div className='flex items-center justify-center h-screen'>
				<div className='animate-spin h-10 w-10 border-t-2 border-b-2 border-gray-900 rounded-full'></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='container mx-auto my-4'>
				<div className='alert alert-danger' role='alert'>
					{error}
				</div>
			</div>
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
		})),
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		setDateRange(tempDateRange);
	};

	return (
		<div className='container mx-auto my-4'>
			<h1 className='mb-4'>Charts</h1>
			<form onSubmit={handleSubmit} className='flex items-center mb-4'>
				<label className='mr-2'>Date Range: </label>
				<DatePicker
					selectsRange={true}
					startDate={tempDateRange[0]}
					endDate={tempDateRange[1]}
					onChange={(update) => setTempDateRange(update)}
					dateFormat='yyyy-MM-dd'
					className='form-control mr-2'
				/>
				<button type='submit' className='btn btn-secondary mx-2'>
					Set Date Range
				</button>
			</form>

			<div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
				{Object.entries(totalCounts).map(([key, values]) => (
					<div key={key} className='col-span-1'>
						<div className='bg-white shadow-md rounded-lg p-4'>
							<h2 className='text-lg font-bold mb-2'>
								{key.charAt(0).toUpperCase() + key.slice(1)}
							</h2>
							{Array.isArray(values) ? (
								values.map((item, index) => (
									<p key={index}>
										Week {item.week}: {item.count}
									</p>
								))
							) : (
								<p>{values}</p>
							)}
						</div>
					</div>
				))}
			</div>

			<div className='mb-4'>
				<h2 className='mb-4'>Combined Charts</h2>
				<div className='bg-white shadow-md rounded-lg p-4'>
					<Bar data={combinedData} options={chartOptions} />
				</div>
			</div>

			{Object.keys(stats).map((key) => (
				<div key={key} className='mb-4'>
					<h2 className='mb-4'>{key.charAt(0).toUpperCase() + key.slice(1)}</h2>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='col-span-1'>
							<div className='bg-white shadow-md rounded-lg p-4'>
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
							</div>
						</div>
						<div className='col-span-1'>
							<div className='bg-white shadow-md rounded-lg p-4'>
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
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default Charts;
