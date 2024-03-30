import React, { useState, useEffect } from 'react';
import { ListGroup, Container, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useRescueRedirect } from './hooks/useRescueRedirect';

const RescueConversations = () => {
	const [conversations, setConversations] = useState([]);
	const [rescueId, setRescueId] = useState(null);

	useRescueRedirect();

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_BASE_URL;

		const fetchRescueId = async () => {
			try {
				// Fetch the ID of the rescue associated with the current user
				const rescueResponse = await axios.get(`${apiUrl}/auth/my-rescue`, {
					withCredentials: true,
				});
				setRescueId(rescueResponse.data.id);
			} catch (error) {
				console.error('Error fetching rescue ID:', error);
			}
		};

		const fetchConversations = async () => {
			try {
				if (rescueId) {
					// Use the rescueId as the participantId to fetch relevant conversations
					const conversationsResponse = await axios.get(
						`${apiUrl}/conversations/?type=Rescue&participantId=${rescueId}`,
						{
							withCredentials: true,
						}
					);
					// Sort conversations by most recent based on lastMessageAt
					const sortedConversations = conversationsResponse.data.sort(
						(a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
					);
					setConversations(sortedConversations);
					console.log(sortedConversations);
				}
			} catch (error) {
				console.error('Error fetching rescue conversations:', error);
			}
		};

		fetchRescueId().then(fetchConversations);
	}, [rescueId]); // Re-run effect if rescueId changes

	const formatIsoDateString = (isoDateString) => {
		if (!isoDateString) return 'Date not available';

		const date = new Date(isoDateString);
		return new Intl.DateTimeFormat('en-GB', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23', // Ensures 24-hour time
			timeZone: 'UTC', // Adjust according to the desired time zone
		}).format(date);
	};

	// Function to get participant names, excluding the current rescue
	const getParticipantNames = (participants) => {
		// Filter out the rescue participant using the rescueId state
		return participants
			.filter((p) => p.participantId && p.participantType !== 'Rescue') // Ensure participantId exists and doesn't match the rescueId
			.map(
				(p) =>
					p.participantId?.rescueName || p.participantId?.firstName || 'Unknown'
			) // Map to names
			.join(', '); // Join names with comma if multiple
	};

	return (
		<div
			className='d-flex flex-column align-items-stretch flex-shrink-0 bg-body-tertiary'
			style={{ width: '380px' }}
		>
			<Container className='p-3 border-bottom'>
				<Row className='align-items-center'>
					<Col>
						<span className='fs-5 fw-semibold'>My Messages</span>
					</Col>
				</Row>
			</Container>
			<ListGroup className='list-group-flush border-bottom scrollarea'>
				{conversations.map((conversation) => (
					<ListGroup.Item
						action
						key={conversation._id}
						className={`py-3 lh-sm ${
							conversation.status === 'active' ? 'bg-info' : 'bg-secondary'
						}`}
						aria-current={conversation.status === 'active' ? 'true' : undefined}
					>
						{/* New addition: Display participant names */}
						<div className='d-flex w-100 justify-content-between'>
							<small className='text-muted'>
								{getParticipantNames(conversation.participants)}
							</small>
							<small
								className={
									conversation.status === 'active' ? '' : 'text-body-secondary'
								}
							>
								{conversation.lastMessageAt
									? formatIsoDateString(conversation.lastMessageAt)
									: 'Date not available'}
							</small>
						</div>
						<div className='d-flex w-100 align-items-center justify-content-between'>
							<strong className='mb-1'>{conversation.lastMessage}</strong>
						</div>
						<div className='col-10 mb-1 small'>{conversation.content}</div>
					</ListGroup.Item>
				))}
			</ListGroup>
		</div>
	);
};

export default RescueConversations;
