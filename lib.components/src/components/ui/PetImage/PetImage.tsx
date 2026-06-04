import React from 'react';
import { ProgressiveImage } from '../ProgressiveImage';
import noImage from '../ImageGallery/no-image.png';

export type PetImageProps = {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
};

export const PetImage: React.FC<PetImageProps> = ({ src, alt, className, eager = false }) => {
  if (!src) {
    return <img src={noImage} alt={alt} className={className} />;
  }

  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={className}
      eager={eager}
      errorFallback={<img src={noImage} alt={alt} />}
    />
  );
};
