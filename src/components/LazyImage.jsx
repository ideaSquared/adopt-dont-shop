import React, { useState, useEffect } from 'react';

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

	return (
		<div className='relative'>
			{!loaded && (
				<div className='absolute inset-0 flex items-center justify-center'>
					<div className='animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-gray-300'></div>
				</div>
			)}
			{loaded && (
				<img
					src={imageSrc}
					alt={alt}
					className={`${classes} opacity-${loaded ? '100' : '0'}`}
					style={style}
				/>
			)}
		</div>
	);
};

export default LazyImage;
