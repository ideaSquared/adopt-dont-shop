import React from 'react';

interface PetData {
	images: string[];
	name: string;
	long_description: string;
	short_description: string;
	gender: string;
	age: number;
	type: string;
	status: string;
}

interface MessagesPetDisplayProps {
	petData: PetData | null;
	isExpanded: boolean;
	toggleHeight: () => void;
}

const MessagesPetDisplay: React.FC<MessagesPetDisplayProps> = ({
	petData,
	isExpanded,
	toggleHeight,
}) => {
	if (!petData) return null;
	const fileUploadsPath = `${import.meta.env.VITE_API_IMAGE_BASE_URL}/uploads/`;

	return (
		<div
			className={`mb-4 bg-white shadow rounded-lg overflow-hidden ${
				isExpanded ? 'flex-col' : 'flex-row'
			} flex`}
			style={{
				height: isExpanded ? 'auto' : '15vh',
				maxWidth: '100%',
			}}
		>
			{petData.images && petData.images.length > 0 && (
				<div
					className={`w-full ${isExpanded ? 'h-40' : 'h-15vh'} overflow-hidden`}
				>
					<div className='carousel'>
						{petData.images.map((image, index) => (
							<div className='carousel-item' key={index}>
								<img
									className='w-full'
									src={fileUploadsPath + image}
									alt={`Slide ${index}`}
									style={{
										objectFit: 'cover',
										height: isExpanded ? '40vh' : '15vh',
									}}
								/>
							</div>
						))}
					</div>
				</div>
			)}
			<div
				className='flex flex-col justify-between p-4'
				style={{ width: isExpanded ? 'auto' : '100%' }}
			>
				<div>
					<h2 className='text-2xl font-bold text-gray-800'>{petData.name}</h2>
					<p className='text-gray-600'>
						{isExpanded ? petData.long_description : petData.short_description}
					</p>
					{isExpanded && (
						<div className='space-x-2 mt-2'>
							<span className='bg-blue-500 text-white px-2 py-1 rounded'>
								{petData.gender}
							</span>
							<span className='bg-green-500 text-white px-2 py-1 rounded'>
								{petData.age} years old
							</span>
							<span className='bg-yellow-500 text-black px-2 py-1 rounded'>
								{petData.type}
							</span>
							<span className='bg-purple-500 text-white px-2 py-1 rounded'>
								{petData.status}
							</span>
						</div>
					)}
				</div>
				<button
					onClick={toggleHeight}
					className='bg-gray-200 text-gray-800 self-end mt-4 px-4 py-2 rounded hover:bg-gray-300 transition-colors'
				>
					{isExpanded ? 'See less' : 'See more'}
				</button>
			</div>
		</div>
	);
};

export default MessagesPetDisplay;
