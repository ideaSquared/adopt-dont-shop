import React, { useState } from 'react';

interface Item {
	name: string;
	age: number;
	gender: string;
	status: string;
	short_description: string;
	long_description: string;
	images: string[];
}

interface SwipeProps {
	item: Item;
}

const Swipe: React.FC<SwipeProps> = ({ item }) => {
	const [viewDetails, setViewDetails] = useState(false);
	const toggleViewDetails = () => setViewDetails(!viewDetails);
	const images = item.images;
	const basePath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;
	const fallbackImage = 'https://placehold.it/500';
	const imageSrc =
		images && images.length > 0 ? `${basePath}${images[0]}` : fallbackImage;

	return (
		<div className='flex items-center justify-center h-screen p-4'>
			<div
				className='bg-cover bg-center rounded-lg shadow-lg w-full max-w-md h-96 relative overflow-hidden'
				style={{ backgroundImage: `url(${imageSrc})` }}
			>
				<div className='bg-black bg-opacity-50 absolute inset-0 rounded-lg flex flex-col p-4 text-white'>
					<div className='flex justify-between items-center mb-2'>
						<h2 className='text-xl font-bold'>{item.name}</h2>
						<div className='flex space-x-2'>
							<span className='bg-gray-700 text-xs rounded-full px-2 py-1'>
								Age: {item.age}
							</span>
							<span className='bg-blue-500 text-xs rounded-full px-2 py-1'>
								{item.gender}
							</span>
							<span
								className={`text-xs rounded-full px-2 py-1 ${
									item.status === 'Adopted' ? 'bg-green-500' : 'bg-yellow-500'
								}`}
							>
								{item.status}
							</span>
						</div>
					</div>
					<p className='text-sm'>{item.short_description}</p>
					{viewDetails && (
						<p className='text-sm mt-2'>{item.long_description}</p>
					)}
					<button
						onClick={toggleViewDetails}
						className='mt-2 text-sm underline'
					>
						{viewDetails ? 'View less' : 'View more'}
					</button>
					<div className='flex justify-around mt-auto space-x-4'>
						<button
							className='bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition transform hover:scale-110'
							aria-label='Dislike'
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								className='w-6 h-6'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M6 18L18 6M6 6l12 12'
								/>
							</svg>
						</button>
						<button
							className='bg-gray-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition transform hover:scale-110'
							aria-label='Love'
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								className='w-6 h-6'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
								/>
							</svg>
						</button>
						<button
							className='bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition transform hover:scale-110'
							aria-label='Like'
						>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								className='w-6 h-6'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M14 9l6-6m0 0l-6 6m6-6v6m-6 10h-2a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v10a4 4 0 01-4 4z'
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Swipe;
