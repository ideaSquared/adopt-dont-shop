import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaginationControls from '../common/PaginationControls';
import PetCard from '../cards/PetCard';
import { Pet } from '../../types/pet';

interface PetTableProps {
	pets: Pet[];
	onEditPet: (pet: Pet) => void;
	onDeletePet: (petId: string) => void;
	canEditPet: boolean;
	canDeletePet: boolean;
	isAdmin: boolean;
}

const PetTable: React.FC<PetTableProps> = ({
	pets,
	onEditPet,
	onDeletePet,
	canEditPet,
	canDeletePet,
	isAdmin,
}) => {
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [petsPerPage] = useState<number>(10);
	const [isGridView, setIsGridView] = useState<boolean>(false);
	const navigate = useNavigate();

	const indexOfLastPet = currentPage * petsPerPage;
	const indexOfFirstPet = indexOfLastPet - petsPerPage;
	const currentPets = pets.slice(indexOfFirstPet, indexOfLastPet);
	const totalPages = Math.ceil(pets.length / petsPerPage);

	const handleRatingClick = (petId: string) => {
		navigate(`/dashboard/applications/${petId}`);
	};

	return (
		<div>
			<div className='flex justify-end mb-4'>
				<button
					className={`mr-2 px-4 py-2 rounded ${
						isGridView ? 'bg-gray-300' : 'bg-blue-500 text-white'
					}`}
					onClick={() => setIsGridView(true)}
				>
					Grid View
				</button>
				<button
					className={`px-4 py-2 rounded ${
						!isGridView ? 'bg-gray-300' : 'bg-blue-500 text-white'
					}`}
					onClick={() => setIsGridView(false)}
				>
					Table View
				</button>
			</div>

			{isGridView ? (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{currentPets.map((pet) => (
						<PetCard
							key={pet.pet_id}
							pet={pet}
							onEditPet={onEditPet}
							onDeletePet={onDeletePet}
							canEditPet={canEditPet}
							canDeletePet={canDeletePet}
							onRatingClick={handleRatingClick}
						/>
					))}
				</div>
			) : (
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
							<th className='border px-4 py-2'>Love</th>
							<th className='border px-4 py-2'>Like</th>
							<th className='border px-4 py-2'>Dislike</th>
							<th className='border px-4 py-2'>Actions</th>
						</tr>
					</thead>
					<tbody>
						{currentPets.map((pet) => (
							<tr key={pet.pet_id} className='hover:bg-gray-100'>
								{isAdmin && <td className='border px-4 py-2'>{pet.pet_id}</td>}
								<td className='border px-4 py-2'>
									{pet.images && pet.images.length > 0 ? (
										<img
											src={`${
												import.meta.env.VITE_API_IMAGE_BASE_URL
											}/uploads/${pet.images[0]}`}
											alt={`Image of ${pet.name}`}
											className='w-24 h-24 object-cover'
										/>
									) : (
										<span>No Image</span>
									)}
								</td>
								<td className='border px-4 py-2'>{pet.name || ''}</td>
								<td className='border px-4 py-2'>{pet.type || ''}</td>
								<td className='border px-4 py-2'>{pet.status || ''}</td>
								{isAdmin && (
									<td className='border px-4 py-2'>{pet.ownerInfo || ''}</td>
								)}
								<td className='border px-4 py-2'>{pet.age || ''}</td>
								<td
									className='border px-4 py-2 love'
									onClick={() => handleRatingClick(pet.pet_id)}
								>
									{pet.ratings?.love || 0}
								</td>
								<td
									className='border px-4 py-2 like'
									onClick={() => handleRatingClick(pet.pet_id)}
								>
									{pet.ratings?.like || 0}
								</td>
								<td className='border px-4 py-2 dislike'>
									{pet.ratings?.dislike || 0}
								</td>
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
			)}
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				onChangePage={setCurrentPage}
			/>
		</div>
	);
};

export default PetTable;
