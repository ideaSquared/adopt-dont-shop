import React, { useState } from 'react';
import { HandThumbsDown, HeartFill, HandThumbsUp } from 'react-bootstrap-icons';
import './Swipe.scss';
import { Pet } from '../../types/pet';

interface SwipeLandingProps {
	item: Pet;
	handleSwipe: (direction: 'left' | 'love' | 'right') => void;
}

const SwipeLanding: React.FC<SwipeLandingProps> = ({ item, handleSwipe }) => {
	const [viewDetails, setViewDetails] = useState<boolean>(false);
	const [animationClass, setAnimationClass] = useState<string>('');
	const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

	const toggleViewDetails = () => setViewDetails(!viewDetails);

	const images = item.images || [];
	const basePath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const fallbackImage = 'https://placehold.it/500';
	const imageSrc =
		images.length > 0
			? `${basePath}${images[currentImageIndex]}`
			: fallbackImage;

	const nextImage = () =>
		setCurrentImageIndex(
			(prevIndex: number) => (prevIndex + 1) % images.length
		);

	const prevImage = () =>
		setCurrentImageIndex((prevIndex: number) =>
			prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1
		);

	const handleAction = (action: 'left' | 'love' | 'right') => {
		switch (action) {
			case 'left':
				setAnimationClass('fly-out-left');
				break;
			case 'right':
				setAnimationClass('fly-out-right');
				break;
			case 'love':
				setAnimationClass('fly-out-top');
				break;
			default:
				return;
		}

		setTimeout(() => {
			handleSwipe(action);
			setAnimationClass('');
		}, 500);
	};

	const capitalizeFirstLetter = (str: string) =>
		str.charAt(0).toUpperCase() + str.slice(1).toLowerCase().replace(/_/g, ' ');

	const details = [
		{ label: 'Breed', value: item.breed },
		{ label: 'Vaccination Status', value: item.vaccination_status },
		{ label: 'Temperament', value: item.temperament },
		{ label: 'Health', value: item.health },
		{ label: 'Size', value: item.size },
		{ label: 'Grooming Needs', value: item.grooming_needs },
		{ label: 'Training & Socialization', value: item.training_socialization },
		{ label: 'Commitment Level', value: item.commitment_level },
		{ label: 'Other Pets', value: item.other_pets },
		{ label: 'Household', value: item.household },
		{ label: 'Energy', value: item.energy },
		{ label: 'Family', value: item.family },
	];

	return (
		<div className='flex items-center justify-center h-screen p-8 bg-gray-100'>
			{!viewDetails ? (
				<div
					className={`relative bg-cover bg-center rounded-lg shadow-lg w-full max-w-3xl h-[36rem] ${animationClass} transition-transform duration-500 ease-in-out`}
					style={{ backgroundImage: `url(${imageSrc})` }}
				>
					<div className='absolute inset-0 bg-black bg-opacity-50 rounded-lg flex flex-col p-8 text-white'>
						<div className='flex justify-between items-center mb-4'>
							<h2 className='text-3xl font-bold'>{item.name}</h2>
							<div className='flex flex-wrap space-x-2'>
								<span className='bg-gray-700 text-xs sm:text-sm md:text-base rounded-full px-3 py-1'>
									Distance: {item.distance ?? 'N/A'}
								</span>
								<span className='bg-gray-700 text-xs sm:text-sm md:text-base rounded-full px-3 py-1'>
									Age: {item.age}
								</span>
								<span
									className={`${
										item.gender === 'female'
											? 'bg-pink-500'
											: item.gender === 'male'
											? 'bg-blue-500'
											: 'bg-gray-500'
									} text-xs sm:text-sm md:text-base rounded-full px-3 py-1`}
								>
									{item.gender}
								</span>
								<span
									className={`text-xs sm:text-sm md:text-base rounded-full px-3 py-1 ${
										item.status === 'Adopted' ? 'bg-green-500' : 'bg-yellow-500'
									}`}
								>
									{item.status}
								</span>
							</div>
						</div>
						<p className='text-sm sm:text-base md:text-lg mb-4'>
							{item.short_description}{' '}
							<a
								href='#'
								onClick={(e) => {
									e.preventDefault();
									toggleViewDetails();
								}}
								className='underline hover:text-yellow-500'
							>
								See more...
							</a>
						</p>
						<div className='absolute bottom-8 left-8 right-8 flex justify-around'>
							<button
								className='bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition transform hover:scale-110'
								onClick={() => handleAction('left')}
								aria-label='Dislike'
							>
								<HandThumbsDown size={24} />
							</button>
							<button
								className='bg-gray-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition transform hover:scale-110'
								onClick={() => handleAction('love')}
								aria-label='Love'
							>
								<HeartFill size={24} />
							</button>
							<button
								className='bg-green-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition transform hover:scale-110'
								onClick={() => handleAction('right')}
								aria-label='Like'
							>
								<HandThumbsUp size={24} />
							</button>
						</div>
					</div>
					<div className='absolute top-1/2 transform -translate-y-1/2 left-8 right-8 flex justify-between'>
						<button
							className='bg-white text-black rounded-full p-4 shadow-md transition transform hover:scale-110'
							onClick={prevImage}
							aria-label='Previous Image'
						>
							&lt;
						</button>
						<button
							className='bg-white text-black rounded-full p-4 shadow-md transition transform hover:scale-110'
							onClick={nextImage}
							aria-label='Next Image'
						>
							&gt;
						</button>
					</div>
				</div>
			) : (
				<div
					className={`relative bg-white rounded-lg shadow-lg w-full max-w-3xl h-[36rem] p-8 flex flex-col items-center justify-center ${animationClass} transition-transform duration-500 ease-in-out`}
				>
					<h2 className='text-3xl font-bold mb-4'>{item.name}</h2>
					<p className='mb-4 text-gray-700 text-lg'>{item.long_description}</p>
					<div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left text-gray-700 w-full'>
						{details
							.filter((detail) => detail.value)
							.map((detail, index) => (
								<p key={index} className='bg-gray-100 p-2 rounded-lg shadow-sm'>
									<strong>{detail.label}:</strong>{' '}
									{capitalizeFirstLetter(detail.value)}
								</p>
							))}
					</div>
					<button
						className='bg-gray-500 text-white rounded-full px-6 py-3 mt-8 shadow-lg transition transform hover:scale-110'
						onClick={toggleViewDetails}
					>
						Back
					</button>
				</div>
			)}
		</div>
	);
};

export default SwipeLanding;
