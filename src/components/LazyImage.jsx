import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

const LazyImage = ({ src, alt, className = '', fluid = false, style = {} }) => {
	const [imageSrc, setImageSrc] = useState('');
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		const img = new Image();
		img.src = src;
		img.onload = () => {
			setImageSrc(src);
			setLoaded(true);
		};
		img.onerror = () => {
			// Handle the error gracefully, perhaps setting a default image or error indicator
			setImageSrc('path/to/default/image.png'); // Ensure you have a default or error image
		};
	}, [src]);

	const classes = `${className} ${fluid ? 'img-fluid' : ''}`.trim();

	if (!loaded) {
		return (
			<div className='text-center p-5'>
				<Spinner animation='border' role='status'>
					<span className='visually-hidden'>Loading...</span>
				</Spinner>
			</div>
		);
	}

	return <img src={imageSrc} alt={alt} className={classes} style={style} />;
};

export default LazyImage;
