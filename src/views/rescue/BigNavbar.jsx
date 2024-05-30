import React from 'react';
import { Link } from 'react-router-dom';
import LazyImage from '../../components/LazyImage';

const BigNavbar = ({ activeSection, navImages }) => {
	const handleSectionChange = (sectionName) => {
		activeSection(sectionName);
	};

	return (
		<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4'>
			{navImages.map((img, index) => (
				<div key={index} className='w-full'>
					<div className='bg-blue-100 shadow-md hover:shadow-lg rounded-lg overflow-hidden'>
						<Link
							to='#'
							className='block no-underline'
							onClick={() => handleSectionChange(img.component)}
						>
							<LazyImage
								src={img.src}
								alt={img.title}
								className='w-full h-32 sm:h-40 md:h-48 object-cover'
							/>
							<div className='bg-black bg-opacity-50 text-white text-center py-2'>
								{img.title}
							</div>
						</Link>
					</div>
				</div>
			))}
		</div>
	);
};

export default BigNavbar;
