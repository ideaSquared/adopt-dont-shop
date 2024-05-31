import React, { ChangeEvent, FormEvent } from 'react';

interface MessageInputProps {
	message: string;
	setMessage: (message: string) => void;
	canCreateMessages: boolean;
	handleSend: (event: FormEvent<HTMLFormElement>) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
	message,
	setMessage,
	canCreateMessages,
	handleSend,
}) => (
	<form className='mt-auto p-4 bg-gray-100' onSubmit={handleSend}>
		<div className='flex'>
			<textarea
				placeholder='Enter your message...'
				value={message}
				onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
					setMessage(e.target.value)
				}
				className='flex-grow p-2 border border-gray-300 rounded-l-lg resize-none focus:ring-indigo-500 focus:border-indigo-500'
				disabled={!canCreateMessages}
			/>
			<button
				type='submit'
				className={`px-4 py-2 rounded-r-lg transition-colors duration-200 ease-in-out ${
					canCreateMessages
						? 'bg-indigo-600 text-white hover:bg-indigo-700'
						: 'bg-gray-400 text-gray-200 cursor-not-allowed'
				}`}
				disabled={!canCreateMessages}
			>
				Send
			</button>
		</div>
	</form>
);

export default MessageInput;
