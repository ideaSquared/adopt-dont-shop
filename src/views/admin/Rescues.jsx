import React, { useState, useEffect } from 'react';
import { Container, Form } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import RescuesTable from '../../components/tables/RescuesTable';
import RescueDetailsModal from '../../components/modals/RescueDetailsModal';
import RescueService from '../../services/RescueService';
import GenericFilterForm from '../../components/forms/GenericFilterForm';
import { useAdminRedirect } from '../../hooks/useAdminRedirect';
import { useAuth } from '../../contexts/AuthContext';

const Rescues = () => {
	const { authState } = useAuth();
	useAdminRedirect();
	const location = useLocation();
	const canAdd = true;

	const [rescues, setRescues] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [rescuesPerPage] = useState(10);
	const [filterType, setFilterType] = useState('');
	const [searchName, setSearchName] = useState('');
	const [searchEmail, setSearchEmail] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedRescueDetails, setSelectedRescueDetails] = useState(null);

	useEffect(() => {
		if (authState.isAdmin) {
			const params = new URLSearchParams(location.search);
			const searchNameParam = params.get('searchName');
			if (searchNameParam) setSearchName(searchNameParam);
			fetchRescues();
		}
	}, [authState.isAdmin, location.search]);

	const fetchRescues = async () => {
		try {
			const data = await RescueService.fetchAdminRescues();
			setRescues(data);
		} catch (error) {
			alert('Failed to fetch rescues.');
			console.error(error);
		}
	};

	const fetchRescueDetails = async (rescueId) => {
		try {
			const data = await RescueService.fetchAdminRescueDetails(rescueId);

			setSelectedRescueDetails(data);
			setShowModal(true);
		} catch (error) {
			alert('Failed to fetch rescue details.');
			console.error(error);
		}
	};

	const deleteRescue = async (rescueId) => {
		try {
			await RescueService.deleteAdminRescue(rescueId);
			fetchRescues();
		} catch (error) {
			alert('Failed to delete rescue.');
			console.error(error);
		}
	};

	// Function to delete staff from a rescue
	const deleteStaffFromRescue = async (rescueId, staffId) => {
		try {
			await RescueService.deleteStaffFromAdminRescue(rescueId, staffId);
			fetchRescueDetails(rescueId);
		} catch (error) {
			alert('Failed to delete staff member.');
			console.error(error);
		}
	};

	const filteredRescues = rescues
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
					staffMember.userDetails.email
						.toLowerCase()
						.includes(searchEmail.toLowerCase())
				)
		);

	const indexOfLastRescue = currentPage * rescuesPerPage;
	const indexOfFirstRescue = indexOfLastRescue - rescuesPerPage;
	const currentRescues = filteredRescues.slice(
		indexOfFirstRescue,
		indexOfLastRescue
	);
	const totalPages = Math.ceil(filteredRescues.length / rescuesPerPage);

	const filters = [
		{
			type: 'select',
			label: 'Filter by Type',
			value: filterType, // The current value of the filter
			onChange: (e) => setFilterType(e.target.value), // Function to update the filter value
			options: [
				{ value: '', label: 'All Types' }, // The options for the select dropdown
				{ value: 'individual', label: 'Individual' },
				{ value: 'charity', label: 'Charity' },
				{ value: 'company', label: 'Company' },
			],
			md: 4, // Assuming you want this to take up 4 columns in a grid layout
		},
		{
			type: 'text',
			label: 'Search by Name',
			value: searchName, // The current value of the search input
			onChange: (e) => setSearchName(e.target.value), // Function to update the search input value
			placeholder: 'Search by rescue name',
			md: 4,
		},
		{
			type: 'text',
			label: 'Search by Staff Email',
			value: searchEmail, // The current value of the search input
			onChange: (e) => setSearchEmail(e.target.value), // Function to update the search input value
			placeholder: 'Search by staff email',
			md: 4,
		},
	];

	return (
		<Container fluid>
			<GenericFilterForm filters={filters} canAdd={canAdd} />
			<RescuesTable
				currentRescues={filteredRescues}
				onDeleteRescue={deleteRescue}
				onShowDetails={fetchRescueDetails}
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
			<RescueDetailsModal
				showModal={showModal}
				handleClose={() => setShowModal(false)}
				rescueDetails={selectedRescueDetails}
				onDeleteStaff={deleteStaffFromRescue}
			/>
		</Container>
	);
};

export default Rescues;
