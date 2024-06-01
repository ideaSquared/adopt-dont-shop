import { useState, useEffect, ChangeEvent } from 'react';
import { StaffService } from '../services/StaffService';
import { StaffMember } from '../types/rescue';
import { ErrorResponse } from '../types/error';

interface FilterCriteria {
	nameEmail: string;
	permissions: string;
	verified: boolean;
}

export const useFilteredStaff = (rescueId: string | null) => {
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<ErrorResponse | null>(null);
	const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({
		nameEmail: '',
		permissions: 'all',
		verified: false,
	});

	const fetchStaff = async () => {
		if (!rescueId) {
			setIsLoading(false);
			return;
		}
		setIsLoading(true);
		try {
			const staffData = await StaffService.fetchAllStaffByRescueId(rescueId);
			setStaff(staffData);
			setFilteredStaff(staffData);
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

	useEffect(() => {
		fetchStaff();
	}, [rescueId]);

	useEffect(() => {
		const filtered = staff.filter((staffMember: StaffMember) => {
			const nameEmailMatch = `${staffMember.firstName} ${staffMember.email}`
				.toLowerCase()
				.includes(filterCriteria.nameEmail.toLowerCase());
			const permissionMatch =
				filterCriteria.permissions === 'all' ||
				staffMember.permissions?.includes(filterCriteria.permissions);
			const verifiedMatch =
				!filterCriteria.verified || staffMember.verified_by_rescue;

			return nameEmailMatch && permissionMatch && verifiedMatch;
		});
		setFilteredStaff(filtered);
	}, [staff, filterCriteria]);

	const handleFilterChange =
		(field: keyof FilterCriteria) =>
		(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			const value =
				field === 'verified' && event.target instanceof HTMLInputElement
					? event.target.checked
					: event.target.value;
			setFilterCriteria({ ...filterCriteria, [field]: value });
		};

	const refreshStaff = () => {
		fetchStaff();
	};

	return {
		staff,
		filteredStaff,
		isLoading,
		error,
		filterCriteria,
		handleFilterChange,
		refreshStaff,
	};
};
