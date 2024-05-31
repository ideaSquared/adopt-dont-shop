import React from 'react';
import { Link } from 'react-router-dom';
import './Rescue.scss';
import LazyImage from '../../components/LazyImage';

const SmallNavbar = ({ activeSection, navImages }) => {
	const handleSectionChange = (sectionName) => {
		activeSection(sectionName);
	};

	return (
		<div className='flex justify-center items-stretch gap-2 flex-wrap'>
			{navImages.map((img, index) => (
				<div key={index} className='w-1/4 flex'>
					<div className='w-full h-full bg-light flex flex-col justify-center rounded-lg shadow-md'>
						<Link
							to='#'
							className='text-decoration-none'
							onClick={() => handleSectionChange(img.component)}
						>
							<div className='flex justify-center items-center h-full'>
								<LazyImage
									src={img.src}
									alt={img.title}
									className='max-h-32 object-contain'
								/>
							</div>
							<div className='flex justify-center items-end p-1 md:flex'>
								<span className='w-full text-center bg-dark bg-opacity-75 text-white py-1 rounded-b-lg'>
									{img.title}
								</span>
							</div>
						</Link>
					</div>
				</div>
			))}
		</div>
	);
};

export default SmallNavbar;
