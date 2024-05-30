import React, { useState } from 'react';
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
		return (
			<img
				src={imageUrl}
				alt='Image of pet on the same row'
				className='w-24 h-24 object-cover'
			/>
		);
	};

	const indexOfLastPet = currentPage * petsPerPage;
	const indexOfFirstPet = indexOfLastPet - petsPerPage;
	const currentPets = pets.slice(indexOfFirstPet, indexOfLastPet);
	const totalPages = Math.ceil(pets.length / petsPerPage);

	return (
		<div>
			<table className='table-auto w-full'>
				<thead>
					<tr>
						{isAdmin && <th className='border px-4 py-2'>Pet ID</th>}
						<th className='border px-4 py-2'>Image</th>
						<th className='border px-4 py-2'>Name</th>
						<th className='border px-4 py-2'>Type</th>
						<th className='border px-4 py-2'>Status</th>
						{isAdmin && <th className='border px-4 py-2'>Owner Info</th>}
						<th className='border px-4 py-2'>Age</th>
						<th className='border px-4 py-2'>Actions</th>
					</tr>
				</thead>
				<tbody>
					{currentPets.map((pet) => (
						<tr key={pet.pet_id} className='hover:bg-gray-100'>
							{isAdmin && <td className='border px-4 py-2'>{pet.pet_id}</td>}
							<td
								className='border px-4 py-2'
								style={{ maxWidth: '120px', overflow: 'hidden' }}
							>
								{renderPetImage(pet.images || '')}
							</td>
							<td className='border px-4 py-2'>{pet.name || ''}</td>
							<td className='border px-4 py-2'>{pet.type || ''}</td>
							<td className='border px-4 py-2'>{pet.status || ''}</td>
							{isAdmin && <td className='border px-4 py-2'>{pet.ownerInfo}</td>}
							<td className='border px-4 py-2'>{pet.age || ''}</td>
							<td className='border px-4 py-2'>
								<button
									className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2'
									onClick={() => onEditPet(pet)}
									disabled={!canEditPet}
								>
									Edit
								</button>
								<button
									className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
									onClick={() => onDeletePet(pet.pet_id)}
									disabled={!canDeletePet}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default PetTable;
