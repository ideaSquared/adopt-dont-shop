// src/user/conversations
import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import MessagesPetDisplay from './MessagesPetDisplay';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useAuth } from '../../../contexts/AuthContext';
import { Pet } from '../../../types/pet';
import { Conversation, Message } from '../../../types/conversation';

interface MessagesComponentProps {
	conversation: Conversation;
	onMessageSent: () => void;
	userType: 'User' | 'Rescue';
	canCreateMessages: boolean;
	listOfStaffIds: string[];
}

const MessagesComponent: React.FC<MessagesComponentProps> = ({
	conversation,
	onMessageSent,
	userType,
	canCreateMessages,
	listOfStaffIds,
}) => {
	const [messages, setMessages] = useState<Message[]>([]);
	const [petData, setPetData] = useState<Pet | null>(null);
	const [message, setMessage] = useState<string>('');
	const { authState } = useAuth();
	const userId = authState.userId;
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	useEffect(() => {
		if (conversation) {
			const fetchMessages = async () => {
				const messagesUrl = `${
					import.meta.env.VITE_API_BASE_URL
				}/conversations/messages/${conversation.conversation_id}`;
				const petDataUrl = `${import.meta.env.VITE_API_BASE_URL}/pets/${
					conversation.pet_id
				}`;
				try {
					const [messagesResponse, petDataResponse] = await Promise.all([
						axios.get(messagesUrl, { withCredentials: true }),
						axios.get(petDataUrl, { withCredentials: true }),
					]);
					const sortedMessages = messagesResponse.data.sort(
						(a: Message, b: Message) =>
							new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
					);
					setMessages(sortedMessages);
					setPetData(petDataResponse.data.data);
				} catch (error) {
					console.error('Error fetching data:', error);
				}
			};

			fetchMessages();
		}
	}, [conversation]);

	const handleSend = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!message.trim()) return;

		try {
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/conversations/messages/${
					conversation.conversation_id
				}`,
				{
					messageText: message,
					conversationId: conversation.conversation_id,
					senderId: userId,
					sentAt: new Date().toISOString(),
					status: 'sent',
				},
				{ withCredentials: true }
			);
			setMessages([...messages, response.data]);
			setMessage('');
			onMessageSent();
		} catch (error) {
			console.error('Error sending message:', error);
		}
	};

	if (!conversation) {
		return (
			<div className='p-4 text-center text-gray-500'>
				Select a conversation to view messages.
			</div>
		);
	}

	return (
		<div className='flex flex-col h-screen p-4 bg-gray-100 rounded-lg shadow'>
			<MessagesPetDisplay
				petData={petData}
				isExpanded={isExpanded}
				toggleHeight={() => setIsExpanded(!isExpanded)}
			/>
			<MessageList
				messages={messages}
				userId={userId}
				userType={userType}
				listOfStaffIds={listOfStaffIds}
			/>
			<MessageInput
				message={message}
				setMessage={setMessage}
				canCreateMessages={canCreateMessages}
				handleSend={handleSend}
			/>
		</div>
	);
};

export default MessagesComponent;
