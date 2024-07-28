import React from 'react';

interface PetImageProps {
	src: string;
	alt: string;
	className?: string;
	placeholder?: string;
}

const PetImage: React.FC<PetImageProps> = ({
	src,
	alt,
	className = '',
	placeholder = 'No Image',
}) => {
	return src ? (
		<img src={src} alt={alt} className={className} />
	) : (
		<span>{placeholder}</span>
	);
};

export default PetImage;
