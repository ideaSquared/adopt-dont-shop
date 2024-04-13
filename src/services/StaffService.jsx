// StaffService.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const verifyStaffMember = async (rescueId, staffId) => {
	try {
		await axios.put(
			`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}/verify`,
			{},
			{ withCredentials: true }
		);
	} catch (error) {
		console.error(
			'Error verifying staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const removeStaffMember = async (rescueId, staffId) => {
	try {
		await axios.delete(`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}`, {
			withCredentials: true,
		});
	} catch (error) {
		console.error(
			'Error removing staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const addStaffMember = async (rescueId, staffInfo) => {
	try {
		const response = await axios.post(
			`${API_BASE_URL}/rescue/${rescueId}/staff`,
			staffInfo,
			{
				withCredentials: true,
			}
		);

		return response.data.data;
	} catch (error) {
		console.error(
			'Error adding staff member:',
			error.response?.data || error.message
		);
		throw error;
	}
};

const updateStaffPermissions = async (rescueId, staffId, permissions) => {
	try {
		const response = await axios.put(
			`${API_BASE_URL}/rescue/${rescueId}/staff/${staffId}/permissions`,
			{ permissions },
			{ withCredentials: true }
		);
		// Assuming the server responds with the updated permissions
		// Or adjust according to the actual response structure
		return response.data;
	} catch (error) {
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
