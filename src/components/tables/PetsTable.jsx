import React from 'react';
import { Button, Table } from 'react-bootstrap';

const PetTable = ({
	pets,
	onEditPet,
	onDeletePet,
	canEditPet,
	canDeletePet,
}) => {
	return (
		<Table striped bordered hover>
			<thead>
				<tr>
					<th>Name</th>
					<th>Type</th>
					<th>Status</th>
					<th>Age</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{pets.map((pet) => (
					<tr key={pet._id}>
						<td>{pet.petName}</td>
						<td>{pet.type}</td>
						<td>{pet.status}</td>
						<td>{pet.age}</td>
						<td>
							<Button
								variant='info'
								onClick={() => onEditPet(pet)}
								disabled={!canEditPet}
							>
								Edit
							</Button>{' '}
							<Button
								variant='danger'
								onClick={() => onDeletePet(pet._id)}
								disabled={!canDeletePet}
							>
								Delete
							</Button>
						</td>
					</tr>
				))}
			</tbody>
		</Table>
	);
};

export default PetTable;
