import React from 'react';
import noImage from '../ImageGallery/no-image.png';
import { ProgressiveImage } from '../ProgressiveImage';

export type PetImageProps = {
  src: string | undefined;
  alt: string;
  className?: string;
  eager?: boolean;
};

const NoImageFallback = ({ alt, className }: { alt: string; className?: string }) => (
  <img src={noImage} alt={alt} className={className} />
);

export const PetImage: React.FC<PetImageProps> = ({ src, alt, className, eager }) => {
  if (!src) {
    return <img src={noImage} alt={alt} className={className} />;
  }

  return (
    <ProgressiveImage
      src={src}
      alt={alt}
      className={className}
      eager={eager}
      placeholder={<NoImageFallback alt={alt} className={className} />}
      errorFallback={<NoImageFallback alt={alt} className={className} />}
    />
  );
};

PetImage.displayName = 'PetImage';
