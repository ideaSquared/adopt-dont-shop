import React, { useState, useEffect } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	CheckboxInput,
	Table,
	Button,
} from '@adoptdontshop/components';
import {
	Application,
	ApplicationService,
} from '@adoptdontshop/libs/applications';

const Applications: React.FC = () => {
	const [applications, setApplications] = useState<Application[]>([]);
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<string | null>(null);
	const [onlyWaiting, setOnlyWaiting] = useState<boolean>(false);

	useEffect(() => {
		const fetchedApplications = ApplicationService.getApplications();
		setApplications(fetchedApplications);
	}, []);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleStatusFilterChange = (
		e: React.ChangeEvent<HTMLSelectElement>
	) => {
		setFilterStatus(e.target.value);
	};

	const handleOnlyWaitingBooleanChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		setOnlyWaiting((prevState) => !prevState);
	};

	const filteredApplications = applications.filter((application) => {
		const matchesSearch =
			!searchTerm ||
			application.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			application.pet_name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = !filterStatus || application.status === filterStatus;
		const matchesWaiting = !onlyWaiting || application.status === 'pending';

		return matchesSearch && matchesStatus && matchesWaiting;
	});

	const filterOptions = [
		{ value: '', label: 'All' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'rejected', label: 'Rejected' },
	];

	return (
		<div>
			<h1>Applications</h1>
			<FormInput label='Search by first name or pet name'>
				<TextInput
					value={searchTerm || ''}
					type='text'
					onChange={handleSearchChange}
				/>
			</FormInput>
			<FormInput label='Filter by status'>
				<SelectInput
					options={filterOptions}
					value={filterStatus}
					onChange={handleStatusFilterChange}
				/>
			</FormInput>
			<FormInput label='Show only waiting applications'>
				<CheckboxInput
					checked={onlyWaiting}
					onChange={handleOnlyWaitingBooleanChange}
				/>
			</FormInput>
			<Table hasActions>
				<thead>
					<tr>
						<th>First name</th>
						<th>Pet name</th>
						<th>Description</th>
						<th>Status</th>
						<th>Actioned by</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{filteredApplications.map((application) => (
						<tr key={application.application_id}>
							<td>{application.first_name}</td>
							<td>{application.pet_name}</td>
							<td>{application.description}</td>
							<td>{application.status}</td>
							<td>{application.actioned_by || 'N/A'}</td>
							<td>
								<Button type='button'>View</Button>
								<Button type='button'>Approve</Button>
								<Button type='button'>Reject</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</div>
	);
};

export default Applications;
