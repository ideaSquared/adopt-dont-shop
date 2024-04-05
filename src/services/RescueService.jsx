import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RescueService = {
	fetchRatings: async (rescueId) => {
		try {
			const response = await axios.get(
				`${API_BASE_URL}/ratings/find-ratings/${rescueId}`,
				{
					withCredentials: true,
				}
			);
			return response.data;
		} catch (error) {
			// Handle error or throw it to be handled by the calling component
			console.error('Failed to fetch ratings:', error);
			throw error;
		}
	},

	createConversation: async (rescueId, petId, userId) => {
		try {
			const participants = [
				{ participantId: rescueId, participantType: 'Rescue' },
				{ participantId: userId, participantType: 'User' },
			];
			const response = await axios.post(
				`${API_BASE_URL}/conversations`,
				{ participants, petId },
				{
					withCredentials: true,
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
			return response.data;
		} catch (error) {
			// Handle error or throw it to be handled by the calling component
			console.error('Failed to create conversation:', error);
			throw error;
		}
	},

	fetchRescueProfile: async () => {
		try {
			const response = await axios.get(`${API_BASE_URL}/auth/my-rescue`, {
				withCredentials: true,
			});
			return response.data;
		} catch (error) {
			console.error('Error fetching rescue profile:', error);
			throw error; // Rethrow the error for the caller to handle
		}
	},

	updateRescueProfile: async (rescueId, updates) => {
		try {
			const response = await axios.put(
				`${API_BASE_URL}/rescue/${rescueId}`,
				updates,
				{ withCredentials: true }
			);
			return response.data;
		} catch (error) {
			console.error('Error updating rescue profile:', error);
			throw error; // Rethrow the error for the caller to handle
		}
	},

	submitReferenceNumberForVerification: async (
		rescueId,
		rescueType,
		referenceNumber
	) => {
		try {
			const response = await axios.put(
				`${API_BASE_URL}/rescue/${rescueId}/${rescueType.toLowerCase()}/validate`,
				{ referenceNumber: referenceNumber.trim() },
				{ withCredentials: true }
			);
			return response.data.data;
		} catch (error) {
			console.error(
				'Error submitting reference number for verification:',
				error
			);
			throw error; // Rethrow the error for the caller to handle
		}
	},
};

export default RescueService;
