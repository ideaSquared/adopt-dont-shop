import React, { useState, useEffect } from 'react';
import axios, { AxiosResponse } from 'axios';
import ConversationsComponent from './conversations/ConversationsComponent';
import MessagesComponent from './conversations/ConversationsMessages';
import { useLoginRedirect } from '../../hooks/useLoginRedirect';
import { useAuth } from '../../contexts/AuthContext';
import { Rescue } from '../../types/rescue';
import { Conversation } from '../../types/conversation';
import { User } from '../../types/user';

interface ConversationsProps {
	userType: 'User' | 'Rescue';
	canCreateMessages: boolean;
	canReadMessages: boolean;
}

// Type guard for AxiosResponse
const isAxiosResponse = (response: any): response is AxiosResponse => {
	return response && response.data;
};

// Type guard for Fetch Response
const isFetchResponse = (response: any): response is Response => {
	return response && response.json;
};

const Conversations: React.FC<ConversationsProps> = ({
	userType,
	canCreateMessages,
	canReadMessages,
}) => {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [userId, setUserId] = useState<string | null>(null);
	const [selectedConversation, setSelectedConversation] =
		useState<Conversation | null>(null);
	const [refreshConversations, setRefreshConversations] = useState(false);
	const [listOfStaffIds, setStaffIDs] = useState<string[]>([]);
	useLoginRedirect();
	const { logout } = useAuth();

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
				let response: AxiosResponse<any, any> | Response;
				if (userType === 'Rescue') {
					response = await axios.get(apiUrl, { withCredentials: true });
				} else {
					response = await fetch(apiUrl, {
						method: 'GET',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
					});
				}

				let data: User | Rescue;
				if (isAxiosResponse(response)) {
					data = response.data;
				} else if (isFetchResponse(response)) {
					data = await response.json();
				} else {
					throw new Error('Unexpected response type');
				}

				if ('userId' in data || 'rescue_id' in data) {
					const idKey = userType === 'Rescue' ? 'rescue_id' : 'userId';
					if (userType === 'Rescue') {
						const ids = (data as Rescue).staff.map(
							(staffMember) => staffMember.userId
						);
						setStaffIDs(ids);
					}

					setUserId((data as any)[idKey]);
					fetchConversations((data as any)[idKey]);
				} else {
					if ('status' in response && response.status === 401) {
						logout();
					}

					throw new Error((data as any).message || 'Failed to fetch details.');
				}
			} catch (error) {
				console.error(
					`Error fetching ${userType.toLowerCase()} details:`,
					error
				);
			}
		};

		const fetchConversations = async (id: string) => {
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

	const handleConversationSelect = async (conversation: Conversation) => {
		setSelectedConversation(conversation);

		try {
			await axios.put(
				`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/read/${
					conversation.conversation_id
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
		<div
			className={`${
				userType === 'Rescue' ? 'h-full p-0' : 'pt-3'
			} flex flex-col`}
		>
			<div
				className={`${
					userType === 'Rescue' ? 'h-full' : 'p-1'
				} flex flex-col md:flex-row`}
			>
				<div
					className={`${
						userType === 'Rescue' ? 'h-full' : ''
					} flex-grow-0 md:flex-none md:w-1/3`}
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
				</div>
				<div
					className={`${
						userType === 'Rescue' ? 'h-full' : ''
					} flex-grow md:w-2/3`}
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
						<div className='flex flex-col h-full p-2 bg-light mx-2 rounded'>
							<div
								className={`flex justify-center items-center ${
									userType === 'Rescue' ? 'h-full' : ''
								}`}
							>
								<div className='bg-info p-4 rounded'>
									<p>Select a conversation to view messages.</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Conversations;
