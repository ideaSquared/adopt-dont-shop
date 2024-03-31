import React from 'react';
import SwipeContainer from './SwipeContainer';

const HomePage = () => {
	return (
		<div className='centered-container'>
			<SwipeContainer ratingSource='User' onModel='Pet' />
		</div>
	);
};

export default HomePage;
