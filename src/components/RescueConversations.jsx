// RescueConversations.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationsComponent from './ConversationsComponent';
import MessagesComponent from './ConversationsMessages';
import { Container, Row, Col } from 'react-bootstrap';

const RescueConversations = () => {
	const [conversations, setConversations] = useState([]);
	const [rescueId, setRescueId] = useState(null);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [refreshConversations, setRefreshConversations] = useState(false);

	const triggerConversationRefresh = () => {
		setRefreshConversations((prevState) => !prevState);
	};

	useEffect(() => {
		const apiUrl = import.meta.env.VITE_API_BASE_URL + '/auth/my-rescue';
		const fetchRescueId = async () => {
			try {
				const response = await axios.get(apiUrl, { withCredentials: true });
				setRescueId(response.data.id);
				fetchConversations(response.data.id);
			} catch (error) {
				console.error('Error fetching rescue ID:', error);
			}
		};

		const fetchConversations = async (id) => {
			try {
				const conversationsResponse = await axios.get(
					`${
						import.meta.env.VITE_API_BASE_URL
					}/conversations/?type=Rescue&participantId=${id}`,
					{
						withCredentials: true,
					}
				);
				setConversations(conversationsResponse.data);
			} catch (error) {
				console.error('Error fetching rescue conversations:', error);
			}
		};

		fetchRescueId();
	}, [refreshConversations]);

	const handleConversationSelect = (conversation) => {
		setSelectedConversation(conversation);
	};

	return (
		<Container fluid>
			<Row>
				<Col md={4}>
					<ConversationsComponent
						conversations={conversations}
						title='Rescue'
						onConversationSelect={handleConversationSelect}
					/>
				</Col>
				<Col md={8}>
					{selectedConversation ? (
						<MessagesComponent
							conversation={selectedConversation}
							onMessageSent={triggerConversationRefresh}
						/>
					) : (
						<div>Select a conversation to view messages.</div>
					)}
				</Col>
			</Row>
		</Container>
	);
};

export default RescueConversations;
