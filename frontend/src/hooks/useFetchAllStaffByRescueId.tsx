import { useState, useEffect } from 'react';
import { StaffService } from '../services/StaffService';
import { StaffMember } from '../types/rescue';
import { ErrorResponse } from '../types/error';

export const useFetchAllStaffByRescueId = (rescueId: string | null) => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<ErrorResponse | null>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            if (!rescueId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const staffData = await StaffService.fetchAllStaffByRescueId(rescueId);
                setStaff(staffData);
            } catch (err: any) {
                console.error('Error fetching staff by rescue ID:', err);
                setError({
                    status: err.response?.status || 500,
                    message: err.message || 'An unexpected error occurred',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchStaff();
    }, [rescueId]);

    return { staff, isLoading, error };
};
