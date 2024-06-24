import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Rescue } from '../../types/rescue';
import useApplications from '../../hooks/useApplications';
import ApplicationRow from './ApplicationRow';
import ApplicationForm from '../../components/forms/ApplicationForm';
import { useAuth } from '../../contexts/AuthContext';

interface AdoptersProps {
	rescueProfile: Rescue | null;
}

const Applications: React.FC<AdoptersProps> = ({ rescueProfile }) => {
	const { petId } = useParams<{ petId: string }>();
	const { authState } = useAuth();
	const {
		applications,
		loading,
		error,
		searchTerm,
		filterStatus,
		showUnActioned,
		handleSearchChange,
		handleFilterChange,
		toggleShowUnActioned,
		handleApprove,
		handleReject,
	} = useApplications(authState.isRescue, rescueProfile?.rescue_id);
	const [selectedApplication, setSelectedApplication] = useState<any>(null);

	const handleViewApplication = (application: any) => {
		setSelectedApplication(application);
	};

	const handleBackToTable = () => {
		setSelectedApplication(null);
	};

	if (loading) return <div className='container mx-auto p-4'>Loading...</div>;
	if (error)
		return <div className='container mx-auto p-4 text-red-500'>{error}</div>;

	const filteredApplications = petId
		? applications.filter((app) => app.pet_id === petId)
		: applications;

	return (
		<div className='container mx-auto p-4'>
			<h1 className='text-2xl font-bold mb-4'>Applications</h1>
			<div className='flex gap-4 mb-4'>
				<input
					type='text'
					placeholder='Search by first name or pet name'
					value={searchTerm}
					onChange={handleSearchChange}
					className='border p-2 rounded'
				/>
				<select
					value={filterStatus}
					onChange={handleFilterChange}
					className='border p-2 rounded'
				>
					<option value=''>All</option>
					<option value='pending'>Pending</option>
					<option value='approved'>Approved</option>
					<option value='rejected'>Rejected</option>
				</select>
				<div className='flex items-center'>
					<input
						type='checkbox'
						checked={showUnActioned}
						onChange={toggleShowUnActioned}
						className='mr-2'
					/>
					<label>Show Only Un-Actioned</label>
				</div>
			</div>
			{selectedApplication ? (
				<div>
					<button
						onClick={handleBackToTable}
						className='mb-4 bg-gray-500 text-white py-2 px-4 rounded'
					>
						Back to Applications
					</button>
					<ApplicationForm
						rescueProfile={rescueProfile ?? undefined}
						application={selectedApplication}
						isViewing={true}
						isCustomer={false}
					/>
				</div>
			) : (
				<div className='overflow-x-auto'>
					<table className='table-auto w-full'>
						<thead>
							<tr>
								<th className='border px-4 py-2'>First Name</th>
								<th className='border px-4 py-2'>Pet Name</th>
								<th className='border px-4 py-2'>Description</th>
								<th className='border px-4 py-2'>Status</th>
								<th className='border px-4 py-2'>Actioned By</th>
								<th className='border px-4 py-2'>Actions</th>
							</tr>
						</thead>
						<tbody>
							{filteredApplications.map((application) => (
								<ApplicationRow
									key={application.application_id}
									application={application}
									onViewApplication={handleViewApplication}
									onApprove={handleApprove}
									onReject={handleReject}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default Applications;
