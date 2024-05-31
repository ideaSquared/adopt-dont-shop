import axios from 'axios';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

interface StaffInfo {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

const verifyStaffMember = async (rescueId: string, staffId: string): Promise<void> => {
	try {
		await axios.put(
			`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}/verify`,
			{},
			{ withCredentials: true }
		);
	} catch (error: any) {
		console.error(
			'Error verifying staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const removeStaffMember = async (rescueId: string, staffId: string): Promise<void> => {
	try {
		await axios.delete(`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}`, {
			withCredentials: true,
		});
	} catch (error: any) {
		console.error(
			'Error removing staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const addStaffMember = async (rescueId: string, staffInfo: StaffInfo): Promise<any> => {
	try {
		const response = await axios.post(
			`${API_BASE_URL}/rescue/${rescueId}/staff`,
			staffInfo,
			{
				withCredentials: true,
			}
		);

		return response.data.data;
	} catch (error: any) {
		console.error(
			'Error adding staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const updateStaffPermissions = async (rescueId: string, staffId: string, permissions: string[]): Promise<any> => {
	try {
		const response = await axios.put(
			`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}/permissions`,
			{ permissions },
			{ withCredentials: true }
		);
		// Assuming the server responds with the updated permissions
		// Or adjust according to the actual response structure
		return response.data;
	} catch (error: any) {
		console.error(
			'Error updating staff permissions:',
			error.response?.data || error.message
		);
		throw error; // Re-throwing to handle it in the calling component
	}
};


export const StaffService = {
	verifyStaffMember,
	removeStaffMember,
	addStaffMember,
	updateStaffPermissions,
};
