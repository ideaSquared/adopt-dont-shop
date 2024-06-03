import axios from 'axios';

const fetchConversations = async (): Promise<any[]> => {
	const endpoint = `${import.meta.env.VITE_API_BASE_URL}/admin/conversations`;
	try {
		const { data } = await axios.get(endpoint);
		return Array.isArray(data) ? data : [];
	} catch (error) {
		console.error('Failed to fetch conversations:', error);
		throw new Error('Failed to fetch conversations.');
	}
};

const deleteConversation = async (id: string): Promise<void> => {
	const endpoint = `${
		import.meta.env.VITE_API_BASE_URL
	}/admin/conversations/${id}`;
	try {
		await axios.delete(endpoint);
	} catch (error) {
		console.error('Failed to delete conversation:', error);
		throw new Error('Failed to delete conversation.');
	}
};

const fetchMessages = async (conversationId: string): Promise<any[]> => {
	const endpoint = `${
		import.meta.env.VITE_API_BASE_URL
	}/admin/conversations/${conversationId}/messages`;
	try {
		const { data } = await axios.get(endpoint);
		return Array.isArray(data)
			? data.sort(
					(a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
			  )
			: [];
	} catch (error) {
		console.error('Failed to fetch messages:', error);
		throw new Error('Failed to fetch messages.');
	}
};

export const ConversationsService = {
	fetchConversations,
	deleteConversation,
	fetchMessages,
};
