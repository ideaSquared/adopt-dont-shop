import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationsComponent from './ConversationsComponent';

const AdopterConversations = () => {
	const [conversations, setConversations] = useState([]);

	useEffect(() => {
		const fetchUserDetails = async () => {
			try {
				const response = await fetch(
					`${import.meta.env.VITE_API_BASE_URL}/auth/details`,
					{
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);

				const data = await response.json();
				if (response.ok) {
					// Now that you have the userId, fetch the conversations
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

		fetchUserDetails();
	}, []);

	return <ConversationsComponent conversations={conversations} title='User' />;
};

export default AdopterConversations;
