import { useState, useEffect, ChangeEvent } from 'react';
import RescueService from '../services/RescueService';
import { Rescue } from '../types/rescue';

export const useRescues = () => {
	const [rescues, setRescues] = useState<Rescue[]>([]);
	const [filteredRescues, setFilteredRescues] = useState<Rescue[]>([]);
	const [filterType, setFilterType] = useState('');
	const [searchName, setSearchName] = useState('');
	const [searchEmail, setSearchEmail] = useState('');
	const [selectedRescueDetails, setSelectedRescueDetails] =
		useState<Rescue | null>(null);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		fetchRescues();
	}, [filterType, searchName, searchEmail]);

	const fetchRescues = async () => {
		try {
			const data = await RescueService.fetchAdminRescues();
			setRescues(data);
			applyFilters(data);
		} catch (error) {
			alert('Failed to fetch rescues.');
			console.error(error);
		}
	};

	const applyFilters = (rescues: Rescue[]) => {
		const filtered = rescues
			.filter((rescue) => !filterType || rescue.rescueType === filterType)
			.filter(
				(rescue) =>
					!searchName ||
					rescue.rescueName.toLowerCase().includes(searchName.toLowerCase())
			)
			.filter(
				(rescue) =>
					!searchEmail ||
					rescue.staff.some((staffMember) =>
						staffMember.email.toLowerCase().includes(searchEmail.toLowerCase())
					)
			);
		setFilteredRescues(filtered);
	};

	const fetchRescueDetails = async (rescueId: string) => {
		try {
			const data = await RescueService.fetchAdminRescueDetails(rescueId);
			setSelectedRescueDetails(data);
			setShowModal(true);
		} catch (error) {
			alert('Failed to fetch rescue details.');
			console.error(error);
		}
	};

	const deleteRescue = async (rescueId: string) => {
		try {
			await RescueService.deleteAdminRescue(rescueId);
			fetchRescues();
		} catch (error) {
			alert('Failed to delete rescue.');
			console.error(error);
		}
	};

	const deleteStaffFromRescue = async (rescueId: string, staffId: string) => {
		try {
			await RescueService.deleteStaffFromAdminRescue(rescueId, staffId);
			fetchRescueDetails(rescueId);
		} catch (error) {
			alert('Failed to delete staff member.');
			console.error(error);
		}
	};

	return {
		rescues: filteredRescues,
		filterType,
		searchName,
		searchEmail,
		showModal,
		selectedRescueDetails,
		handleFilterTypeChange: (e: ChangeEvent<HTMLSelectElement>) =>
			setFilterType(e.target.value),
		handleSearchNameChange: (e: ChangeEvent<HTMLInputElement>) =>
			setSearchName(e.target.value),
		handleSearchEmailChange: (e: ChangeEvent<HTMLInputElement>) =>
			setSearchEmail(e.target.value),
		handleDeleteRescue: deleteRescue,
		handleShowDetails: fetchRescueDetails,
		handleCloseModal: () => setShowModal(false),
		handleDeleteStaff: deleteStaffFromRescue,
	};
};
