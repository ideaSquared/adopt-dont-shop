import React, { useState } from 'react';
import {
	FormInput,
	SelectInput,
	TextInput,
	CheckboxInput,
	Table,
	Button,
} from '@adoptdontshop/components';

const Applications: React.FC = () => {
	const [searchTerm, setSearchTerm] = useState<string | null>(null);
	const [filterStatus, setFilterStatus] = useState<string | null>(null);
	const [onlyWaiting, setOnlyWaiting] = useState<boolean>(false);

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
					<th>First name</th>
					<th>Pet name</th>
					<th>Description</th>
					<th>Status</th>
					<th>Actioned by</th>
					<th>Actions</th>
				</thead>
				<tbody>
					<tr>
						<td>Test first name</td>
						<td>Test pet name</td>
						<td>Test description</td>
						<td>Test status</td>
						<td>Test actioned by</td>
						<td>
							<Button type='button'>View</Button>
							<Button type='button'>Approve</Button>
							<Button type='button'>Reject</Button>
						</td>
					</tr>
				</tbody>
			</Table>
		</div>
	);
};

export default Applications;
