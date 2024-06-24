import React from 'react';
import SwipeContainer from '../swipe/SwipeContainer';

const UserSwiper: React.FC = () => {
	return <SwipeContainer ratingSource='User' onModel='Pet' />;
};

export default UserSwiper;
