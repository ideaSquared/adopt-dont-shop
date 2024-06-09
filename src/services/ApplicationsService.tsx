import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface Application {
	application_id: string;
	first_name: string;
	pet_id: string;
	pet_name: string;
	description: string;
	status: string;
	actioned_by: string | null;
}

const ApplicationService = {
	fetchApplications: async (
		isRescue: boolean,
		rescueId?: string
	): Promise<Application[]> => {
		try {
			let url = `${API_BASE_URL}/applications`;
			if (isRescue && rescueId) {
				url = `${API_BASE_URL}/applications/${rescueId}`;
			}
			const response = await axios.get(url, {
				withCredentials: true,
			});
			return response.data; // Assuming the API returns the applications directly
		} catch (error: any) {
			console.error(
				'Error fetching applications',
				error.response ? error.response.data : error.message
			);
			throw new Error(
				error.response?.data.message ||
					'An error occurred while fetching applications.'
			);
		}
	},

	updateApplicationStatus: async (
		id: string,
		status: 'approved' | 'rejected'
	): Promise<Application> => {
		try {
			const response = await axios.put(
				`${API_BASE_URL}/applications/${id}`,
				{ status },
				{ withCredentials: true }
			);
			return response.data; // Assuming the API returns the updated application directly
		} catch (error: any) {
			console.error(
				`Error ${status} application`,
				error.response ? error.response.data : error.message
			);
			throw new Error(
				error.response?.data.message ||
					`An error occurred while ${status} the application.`
			);
		}
	},

	approveApplication: async (id: string): Promise<Application> => {
		return ApplicationService.updateApplicationStatus(id, 'approved');
	},

	rejectApplication: async (id: string): Promise<Application> => {
		return ApplicationService.updateApplicationStatus(id, 'rejected');
	},
};

export default ApplicationService;
