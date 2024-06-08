import { useState, useEffect, ChangeEvent } from 'react';
import {
	fetchApplications,
	Application,
} from '../services/ApplicationsService';

const useApplications = () => {
	const [applications, setApplications] = useState<Application[]>([]);
	const [filteredApplications, setFilteredApplications] = useState<
		Application[]
	>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [filterStatus, setFilterStatus] = useState<string>('');
	const [showUnActioned, setShowUnActioned] = useState<boolean>(true);

	useEffect(() => {
		const getApplications = async () => {
			try {
				const data = await fetchApplications();
				setApplications(data);
				applyFilters(data);
			} catch (error) {
				setError('Failed to fetch applications');
			} finally {
				setLoading(false);
			}
		};

		getApplications();
	}, []);

	useEffect(() => {
		applyFilters(applications);
	}, [searchTerm, filterStatus, showUnActioned, applications]);

	const applyFilters = (applications: Application[]) => {
		const filtered = applications.filter(
			(application) =>
				(!filterStatus ||
					application.status.toLowerCase() === filterStatus.toLowerCase()) &&
				(!searchTerm ||
					application.first_name
						.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					application.pet_name
						.toLowerCase()
						.includes(searchTerm.toLowerCase())) &&
				(!showUnActioned || !application.actioned_by)
		);
		setFilteredApplications(filtered);
	};

	const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
		setFilterStatus(e.target.value);
	};

	const toggleShowUnActioned = () => {
		setShowUnActioned((prevState) => !prevState);
	};

	return {
		applications: filteredApplications,
		loading,
		error,
		searchTerm,
		filterStatus,
		showUnActioned,
		handleSearchChange,
		handleFilterChange,
		toggleShowUnActioned,
	};
};

export default useApplications;
