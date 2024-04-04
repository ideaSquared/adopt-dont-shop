import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationsComponent from './conversations/ConversationsComponent';
import MessagesComponent from './conversations/ConversationsMessages';
import { Container, Row, Col } from 'react-bootstrap';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';

const Conversations = ({ userType, canCreateMessages, canReadMessages }) => {
	const [conversations, setConversations] = useState([]);
	const [userId, setUserId] = useState(null);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [refreshConversations, setRefreshConversations] = useState(false);
	const [listOfStaffIds, setStaffIDs] = useState([]);
	useLoginRedirect();

	// setUserId(localStorage.getItem('userId'));

	const triggerConversationRefresh = () => {
		setRefreshConversations((prevState) => !prevState);
	};

	useEffect(() => {
		const apiUrl =
			userType === 'Rescue'
				? `${import.meta.env.VITE_API_BASE_URL}/auth/my-rescue`
				: `${import.meta.env.VITE_API_BASE_URL}/auth/details`;

		const fetchDetails = async () => {
			try {
				const response = await (userType === 'Rescue'
					? axios.get(apiUrl, { withCredentials: true })
					: fetch(apiUrl, {
							method: 'GET',
							credentials: 'include',
							headers: {
								'Content-Type': 'application/json',
							},
					  }));

				const data =
					userType === 'Rescue' ? response.data : await response.json();
				if (response.ok || response.status === 200) {
					const idKey = userType === 'Rescue' ? 'id' : 'userId';
					if (userType === 'Rescue') {
						const ids = data.staff.map((staffMember) => staffMember.userId._id);
						setStaffIDs(ids);
					}

					setUserId(data[idKey]);
					fetchConversations(data[idKey]);
				} else {
					throw new Error(data.message || 'Failed to fetch details.');
				}
			} catch (error) {
				console.error(
					`Error fetching ${userType.toLowerCase()} details:`,
					error
				);
			}
		};
		const fetchConversations = async (id) => {
			try {
				const conversationsResponse = await axios.get(
					`${
						import.meta.env.VITE_API_BASE_URL
					}/conversations/?type=${userType}&participantId=${id}`,
					{
						withCredentials: true,
					}
				);
				setConversations(conversationsResponse.data);
			} catch (error) {
				console.error(
					`Error fetching ${userType.toLowerCase()} conversations:`,
					error
				);
			}
		};

		if (!userId) {
			fetchDetails();
		} else {
			fetchConversations(userId);
		}
	}, [refreshConversations, userId, userType]);

	const handleConversationSelect = async (conversation) => {
		setSelectedConversation(conversation);

		// Only applicable for rescues, marking messages as read

		try {
			await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/read/${
					conversation._id
				}`,
				{ userType },
				{ withCredentials: true }
			);
			triggerConversationRefresh(); // Refresh to reflect the changes in UI
		} catch (error) {
			console.error('Error marking messages as read:', error);
		}
	};

	if (!canReadMessages) {
		return <div>You do not have permission to view this page.</div>;
	}

	return (
		<Container fluid className={`${userType === 'Rescue' ? 'h-100 p-0' : ''}`}>
			<Row className={`${userType === 'Rescue' ? 'h-100 g-0' : ''}`}>
				<Col
					xs={12}
					md={userType === 'Rescue' ? 3 : 4}
					className={`${userType === 'Rescue' ? 'h-100' : ''}`}
				>
					{/* Sidebar for Conversations */}
					<ConversationsComponent
						conversations={conversations}
						title={userType}
						onConversationSelect={handleConversationSelect}
						selectedConversation={selectedConversation}
						userType={userType}
						listOfStaffIds={listOfStaffIds}
					/>
				</Col>
				<Col
					xs={12}
					md={userType === 'Rescue' ? 9 : 8}
					className={`${userType === 'Rescue' ? 'h-100' : ''}`}
				>
					{/* Main Content Area */}
					{selectedConversation ? (
						<MessagesComponent
							conversation={selectedConversation}
							onMessageSent={triggerConversationRefresh}
							userType={userType}
							canCreateMessages={canCreateMessages}
							listOfStaffIds={listOfStaffIds}
						/>
					) : (
						<div
							className={`d-flex justify-content-center align-items-center ${
								userType === 'Rescue' ? 'h-100' : ''
							}`}
						>
							Select a conversation to view messages.
						</div>
					)}
				</Col>
			</Row>
		</Container>
	);
};

export default Conversations;
