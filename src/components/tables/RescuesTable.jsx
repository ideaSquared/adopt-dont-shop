import React from 'react';
import { Table, Button } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';

const RescuesTable = ({
	currentRescues,
	onDeleteRescue,
	onShowDetails,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	return (
		<>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Rescue ID</th>
						<th>Rescue Name</th>
						<th>Type</th>
						<th>Staff</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{currentRescues.map((rescue) => (
						<tr key={rescue.rescue_id} style={{ cursor: 'pointer' }}>
							<td>{rescue.rescue_id}</td>
							<td onClick={() => onShowDetails(rescue.rescue_id)}>
								{rescue.rescue_name ?? ''}
							</td>
							<td onClick={() => onShowDetails(rescue.rescue_id)}>
								{rescue.rescue_type ?? 'Type Unavailable'}
							</td>
							<td onClick={() => onShowDetails(rescue.rescue_id)}>
								{rescue.staff.map((staffMember, index) => (
									<div key={index}>
										{staffMember.userDetails?.email ?? 'Email not available'}
									</div>
								))}
							</td>
							<td>
								<Button
									variant='danger'
									onClick={(e) => {
										e.stopPropagation(); // Prevent triggering onShowDetails when clicking the button
										onDeleteRescue(rescue.rescue_id);
									}}
								>
									Delete
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</>
	);
};

export default RescuesTable;
