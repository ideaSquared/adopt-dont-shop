import axios from 'axios';
import { StaffMember } from '../types/rescue';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

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

const addStaffMember = async (rescueId: string, staffInfo: Partial<StaffMember>): Promise<StaffMember> => {
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
        return response.data;
    } catch (error: any) {
        console.error(
            'Error updating staff permissions:',
            error.response?.data || error.message
        );
        throw error;
    }
};

const fetchAllStaffByRescueId = async (rescueId: string): Promise<StaffMember[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/rescue/${rescueId}/staff`, {
            withCredentials: true,
        });
        return response.data.data;
    } catch (error: any) {
        console.error(
            'Error fetching staff by rescue ID:',
            error.response?.data || error.message
        );
        throw error;
    }
};

export const StaffService = {
    verifyStaffMember,
    removeStaffMember,
    addStaffMember,
    updateStaffPermissions,
    fetchAllStaffByRescueId, // Add the new method here
};
