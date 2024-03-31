import { useSwipeable } from 'react-swipeable';

const Swipeable = ({ children, onSwipe }) => {
	const handlers = useSwipeable({
		onSwipedLeft: () => onSwipe('left'),
		onSwipedRight: () => onSwipe('right'),
		preventDefaultTouchmoveEvent: true,
		trackMouse: true,
	});

	return <div {...handlers}>{children}</div>;
};

export default Swipeable;
