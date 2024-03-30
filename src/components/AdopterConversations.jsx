import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationsComponent from './ConversationsComponent';
import MessagesComponent from './ConversationsMessages'; // Assuming this should also be included
import { Container, Row, Col } from 'react-bootstrap';

const AdopterConversations = () => {
	const [conversations, setConversations] = useState([]);
	const [userId, setUserId] = useState(null);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [refreshConversations, setRefreshConversations] = useState(false);

	const triggerConversationRefresh = () => {
		setRefreshConversations((prevState) => !prevState);
	};

	useEffect(() => {
		const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/auth/details`;
		const fetchUserDetails = async () => {
			try {
				const response = await fetch(apiUrl, {
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
				});

				const data = await response.json();
				if (response.ok) {
					setUserId(data.userId);
					fetchConversations(data.userId);
				} else {
					throw new Error(data.message || 'Failed to fetch user details.');
				}
			} catch (error) {
				console.error('Error fetching user details:', error);
			}
		};

		const fetchConversations = async (userId) => {
			try {
				const conversationsResponse = await axios.get(
					`${
						import.meta.env.VITE_API_BASE_URL
					}/conversations/?type=User&participantId=${userId}`,
					{
						withCredentials: true,
					}
				);
				setConversations(conversationsResponse.data);
			} catch (error) {
				console.error('Error fetching adopter conversations:', error);
			}
		};

		if (!userId) {
			fetchUserDetails();
		} else {
			fetchConversations(userId);
		}
	}, [refreshConversations, userId]);

	const handleConversationSelect = (conversation) => {
		setSelectedConversation(conversation);
	};

	return (
		<Container fluid>
			<Row>
				<Col md={4}>
					<ConversationsComponent
						conversations={conversations}
						title='User'
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

export default AdopterConversations;
