import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from './LandingFooter';
import LazyImage from '../components/LazyImage';

const HomePage: React.FC = () => {
	const { authState } = useAuth();
	const navigate = useNavigate();

	const handleButtonClick = () => {
		navigate(authState.isLoggedIn ? '/swipe' : '/login');
	};

	return (
		<div className='bg-primary min-h-screen flex flex-col justify-between'>
			<header className='hero bg-primary text-black text-center py-12'>
				<div className='w-full flex flex-col items-center'>
					<LazyImage
						src='./adoptdontshoplogo.svg'
						alt="Adopt Don't Shop Logo"
						className='w-1/3 md:w-1/4'
					/>
					<h1 className='text-4xl md:text-5xl font-bold mt-6'>
						Welcome to Adopt Don't Shopssssssssss
					</h1>
					<p className='text-lg md:text-xl mt-4 max-w-xl'>
						Discover and adopt your perfect pet today. Join our community and
						help make a difference.
					</p>
					<button
						onClick={handleButtonClick}
						className='bg-white text-primary mt-8 py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-105'
					>
						Find your next pet today
					</button>
				</div>
			</header>
			<Footer />
		</div>
	);
};

export default HomePage;
