import React from 'react';
import { Button, Table, Image } from 'react-bootstrap';
import PaginationControls from '../common/PaginationControls';

const PetTable = ({
	pets,
	onEditPet,
	onDeletePet,
	canEditPet,
	canDeletePet,
	currentPage,
	totalPages,
	onChangePage,
}) => {
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

	const renderPetImage = (images) => {
		if (!images || images.length === 0) {
			// Optionally, you could use a placeholder image URL here
			return 'No Image'; // Or return a default image like <Image src="path/to/default-image.jpg" alt="Default" fluid />
		}
		// const randomIndex = Math.floor(Math.random() * images.length);
		const imageUrl = fileUploadsPath + images[0];
		// Use the Image component with fluid prop for responsive images
		return <Image src={imageUrl} alt='Image of pet on the same row' fluid />;
	};

	return (
		<div>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Image</th>
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
							<td style={{ maxWidth: '120px', overflow: 'hidden' }}>
								{renderPetImage(pet.images)}
							</td>
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
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={onChangePage}
			/>
		</div>
	);
};

export default PetTable;
