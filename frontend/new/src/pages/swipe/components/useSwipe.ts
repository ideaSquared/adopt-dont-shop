import { useState } from 'react';

type SwipeDirection = 'left' | 'right' | null;

export const useSwipe = (onSwipe: (direction: 'left' | 'right') => void) => {
	const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);

	const handleSwipe = (direction: 'left' | 'right') => {
		setSwipeDirection(direction);
		setTimeout(() => {
			onSwipe(direction);
			setSwipeDirection(null); // Reset the swipe direction for future swipes
		}, 300);
	};

	return {
		swipeDirection,
		handleSwipe,
	};
};
