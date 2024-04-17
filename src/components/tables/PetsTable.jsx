import React, { useState } from 'react';
import { Button, Table, Image } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';

const PetTable = ({
	pets,
	onEditPet,
	onDeletePet,
	canEditPet,
	canDeletePet,
	isAdmin,
}) => {
	const [currentPage, setCurrentPage] = useState(1);
	const [petsPerPage] = useState(10);
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

	const renderPetImage = (images) => {
		if (!images || images.length === 0) {
			return 'No Image';
		}
		const imageUrl = fileUploadsPath + images[0];
		return <Image src={imageUrl} alt='Image of pet on the same row' fluid />;
	};

	const indexOfLastPet = currentPage * petsPerPage;
	const indexOfFirstPet = indexOfLastPet - petsPerPage;
	const currentPets = pets.slice(indexOfFirstPet, indexOfLastPet);
	const totalPages = Math.ceil(pets.length / petsPerPage);

	return (
		<div>
			<Table striped bordered hover>
				<thead>
					<tr>
						{isAdmin && <th>Pet ID</th>}
						<th>Image</th>
						<th>Name</th>
						<th>Type</th>
						<th>Status</th>
						{isAdmin && <th>Owner Info</th>}
						{/* Conditionally render this column */}
						<th>Age</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{currentPets.map((pet) => (
						<tr key={pet.pet_id}>
							{isAdmin && <td>{pet.pet_id}</td>}
							<td style={{ maxWidth: '120px', overflow: 'hidden' }}>
								{renderPetImage(pet.images || '')}
							</td>
							<td>{pet.name || ''}</td>
							<td>{pet.type || ''}</td>
							<td>{pet.status || ''}</td>
							{isAdmin && <td>{pet.ownerInfo}</td>}
							{/* Conditionally render this cell */}
							<td>{pet.age || ''}</td>
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
									onClick={() => onDeletePet(pet.pet_id)}
									disabled={!canDeletePet}
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
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default PetTable;
