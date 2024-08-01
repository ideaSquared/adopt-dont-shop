// src/user/conversations
import React, { useRef, useEffect } from 'react';
import './MessageList.scss';
import { Message } from '../../../types/conversation';

interface MessageListProps {
	messages: Message[];
	userType: 'User' | 'Rescue';
	userId: string;
	listOfStaffIds: string[];
}

const MessageList: React.FC<MessageListProps> = ({
	messages,
	userType,
	userId,
	listOfStaffIds,
}) => {
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);

	const scrollToBottom = () => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
				inline: 'start',
			});
		}
	};

	useEffect(() => {
		scrollToBottom();
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	return (
		<div
			className='overflow-auto custom-scroll flex-1 max-h-80vh'
			ref={containerRef}
		>
			{messages.map((msg, index) => {
				const isUserMessage =
					(userType === 'User' && msg.sender_id === userId) ||
					(userType === 'Rescue' && listOfStaffIds.includes(msg.sender_id));
				return (
					<div
						key={index}
						className={`flex ${
							isUserMessage ? 'justify-end' : 'justify-start'
						} mb-2`}
					>
						<div
							className={`p-3 rounded-lg shadow-sm ${
								isUserMessage
									? 'bg-blue-100 text-right'
									: 'bg-blue-600 text-white'
							}`}
							style={{ minWidth: '35%', maxWidth: '75%' }}
						>
							<div className='text-sm font-semibold mb-1'>
								<span
									className={`px-2 py-1 rounded ${
										isUserMessage ? 'bg-blue-200' : 'bg-blue-700'
									}`}
								>
									{msg.sender_name}
								</span>
							</div>
							<div className='whitespace-pre-wrap'>{msg.message_text}</div>
							<div className='text-xs text-gray-500 mt-1'>
								{new Date(msg.sent_at).toLocaleTimeString()} {msg.status}
							</div>
						</div>
						{index === messages.length - 1 && <div ref={messagesEndRef} />}
					</div>
				);
			})}
		</div>
	);
};

export default MessageList;
