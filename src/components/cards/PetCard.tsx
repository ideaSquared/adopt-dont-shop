import React from 'react';
import { Pet } from '../../types/pet';

interface PetCardProps {
	pet: Pet;
	onEditPet: (pet: Pet) => void;
	onDeletePet: (petId: string) => void;
	canEditPet: boolean;
	canDeletePet: boolean;
	onApplicationClick: (petId: string) => void;
	isRescue: boolean;
}

const PetCard: React.FC<PetCardProps> = ({
	pet,
	onEditPet,
	onDeletePet,
	canEditPet,
	canDeletePet,
	onApplicationClick,
	isRescue,
}) => {
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const renderPetImage = (images?: string[]) => {
		if (!images || images.length === 0) {
			return 'No Image';
		}
		const imageUrl = fileUploadsPath + images[0];
		return (
			<img
				src={imageUrl}
				alt={`Image of ${pet.name}`}
				className='w-24 h-24 object-cover'
			/>
		);
	};

	return (
		<div className='relative bg-white p-6 shadow-lg rounded-lg m-4 hover:shadow-xl transition-shadow duration-300 ease-in-out'>
			<div className='absolute top-2 right-2 space-y-2'>
				<span className='bg-blue-500 text-white text-xs font-semibold px-2 py-1 mx-1 rounded-full'>
					{pet.type}
				</span>
				<span className='bg-green-500 text-white text-xs font-semibold px-2 py-1 mx-1 rounded-full'>
					{pet.status}
				</span>
			</div>
			<div className='flex items-center mb-4'>
				{renderPetImage(pet.images)}
				<h3 className='text-2xl font-bold ml-4'>{pet.name}</h3>
			</div>
			<p className='text-gray-700 mb-1'>
				<strong>Age:</strong> {pet.age}
			</p>
			{isRescue && (
				<>
					<div className='flex space-x-4 my-2'>
						<p className='love px-2 py-1 rounded-lg'>
							<strong>Love:</strong> {pet.ratings?.love || 0}
						</p>
						<p className='like px-2 py-1 rounded-lg'>
							<strong>Like:</strong> {pet.ratings?.like || 0}
						</p>
						<p className='dislike px-2 py-1 rounded-lg'>
							<strong>Dislike:</strong> {pet.ratings?.dislike || 0}
						</p>
					</div>
					<div className='flex space-x-4 my-2'>
						<p className='applications px-2 py-1 rounded-lg'>
							<button onClick={() => onApplicationClick(pet.pet_id)}>
								<strong>Applications:</strong> {pet.application_count || 0}
							</button>
						</p>
					</div>
					<div className='mt-6 flex justify-between'>
						<button
							className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
								!canEditPet && 'opacity-50 cursor-not-allowed'
							}`}
							onClick={() => onEditPet(pet)}
							disabled={!canEditPet}
						>
							Edit
						</button>
						<button
							className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${
								!canDeletePet && 'opacity-50 cursor-not-allowed'
							}`}
							onClick={() => onDeletePet(pet.pet_id)}
							disabled={!canDeletePet}
						>
							Delete
						</button>
					</div>
				</>
			)}
		</div>
	);
};

export default PetCard;
