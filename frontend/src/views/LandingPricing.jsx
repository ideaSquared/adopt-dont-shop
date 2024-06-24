import React from 'react';
import Footer from './LandingFooter';

const LandingPricing = () => {
	return (
		<div className='flex flex-col min-h-screen'>
			<div className='bg-primary text-white text-center py-5 mb-4'>
				<div className='w-full flex flex-col items-center'>
					<img
						src='./adoptdontshoplogo.svg'
						alt="Adopt Don't Shop Logo"
						className='w-1/4'
					/>
					<h1 className='text-4xl font-bold mt-4'>Pricing</h1>
				</div>
			</div>
			<Footer />
		</div>
	);
};

export default LandingPricing;
