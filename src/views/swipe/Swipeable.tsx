import React, { ReactNode } from 'react';
import { useSwipeable, SwipeableHandlers, SwipeableProps as ReactSwipeableProps } from 'react-swipeable';

interface SwipeableProps {
	children: ReactNode;
	onSwipe: (direction: 'left' | 'right') => void;
}

const Swipeable: React.FC<SwipeableProps> = ({ children, onSwipe }) => {
	const handlers: SwipeableHandlers = useSwipeable({
		onSwipedLeft: () => onSwipe('left'),
		onSwipedRight: () => onSwipe('right'),
		preventScrollOnSwipe: true, // Use the correct property name
		trackMouse: true,
	});

	return <div {...handlers}>{children}</div>;
};

export default Swipeable;