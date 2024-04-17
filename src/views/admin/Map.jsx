import React, { useRef, useEffect, useState } from 'react';
import { Container, Button } from 'react-bootstrap';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const Map = () => {
	const mapContainerRef = useRef(null);
	const [locations, setLocations] = useState({ users: [], rescues: [] });
	const [showUsers, setShowUsers] = useState(true);
	const [showRescues, setShowRescues] = useState(true);
	const [mapInstance, setMapInstance] = useState(null);
	const [userMarkers, setUserMarkers] = useState([]);
	const [rescueMarkers, setRescueMarkers] = useState([]);

	useEffect(() => {
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;

		const map = new mapboxgl.Map({
			container: mapContainerRef.current,
			style: 'mapbox://styles/mapbox/streets-v11',
			center: [-3.436, 55.3781],
			zoom: 5,
		});
		setMapInstance(map);

		return () => map.remove();
	}, []);

	useEffect(() => {
		if (!mapInstance) return;

		mapInstance.on('load', () => {
			fetchData().then((data) => {
				setLocations(data);
				addMarkers(data); // Initially add all markers
			});
		});
	}, [mapInstance]);

	const fetchData = async () => {
		const response = await fetch(
			`${import.meta.env.VITE_API_BASE_URL}/admin/stats-all-locations`,
			{
				method: 'GET',
				credentials: 'include',
			}
		);
		const data = await response.json();
		return { users: data.users, rescues: data.rescues };
	};

	const addMarkers = (data) => {
		const { users, rescues } = data;

		// Remove existing markers
		removeMarkers(userMarkers);
		removeMarkers(rescueMarkers);

		const newUsersMarkers = [];
		const newRescuesMarkers = [];

		// Add users markers
		if (showUsers) {
			users.forEach((user) => {
				if (user.location) {
					const marker = new mapboxgl.Marker({ color: 'blue' })
						.setLngLat([user.location.x, user.location.y])
						.setPopup(
							new mapboxgl.Popup({ offset: 25 }).setText(
								`${user.city}, ${user.country}`
							)
						)
						.addTo(mapInstance);
					newUsersMarkers.push(marker);
				}
			});
		}

		// Add rescues markers
		if (showRescues) {
			rescues.forEach((rescue) => {
				if (rescue.location) {
					const marker = new mapboxgl.Marker({ color: 'red' })
						.setLngLat([rescue.location.x, rescue.location.y])
						.setPopup(
							new mapboxgl.Popup({ offset: 25 }).setText(
								`${rescue.city}, ${rescue.country}`
							)
						)
						.addTo(mapInstance);
					newRescuesMarkers.push(marker);
				}
			});
		}

		setUserMarkers(newUsersMarkers);
		setRescueMarkers(newRescuesMarkers);
	};

	const removeMarkers = (markers) => {
		markers.forEach((marker) => marker.remove());
	};

	const toggleUsers = () => {
		setShowUsers(!showUsers);
	};

	const toggleRescues = () => {
		setShowRescues(!showRescues);
	};

	useEffect(() => {
		if (mapInstance) {
			addMarkers(locations);
		}
	}, [showUsers, showRescues]);

	return (
		<Container>
			<h1>Map</h1>
			<div ref={mapContainerRef} style={{ height: '75vh' }} />
			<Button
				onClick={toggleUsers}
				variant={showUsers ? 'primary' : 'secondary'}
			>
				{showUsers ? 'Hide Users' : 'Show Users'}
			</Button>
			<Button
				onClick={toggleRescues}
				variant={showRescues ? 'danger' : 'secondary'}
			>
				{showRescues ? 'Hide Rescues' : 'Show Rescues'}
			</Button>
		</Container>
	);
};

export default Map;
