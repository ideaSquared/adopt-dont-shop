import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Badge } from '../Badge';
import { Spinner } from '../Spinner';
import noImage from './no-image.png';
import {
  galleryContainer,
  imageContainer,
  imageWrapper,
  galleryImage,
  deleteButton,
  navigationDots,
  dot,
  uploadButton,
  hiddenInput,
  centeredBadgeContainer,
} from './ImageGallery.css';

interface ImageGalleryProps {
  images: string[];
  viewMode: 'carousel' | 'gallery';
  onUpload?: (file: File) => void;
  onDelete?: (fileName: string) => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, viewMode, onUpload, onDelete }) => {
  const [galleryImages, setGalleryImages] = useState<string[]>(
    images.length > 0 ? images : [noImage]
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState<boolean[]>(
    new Array(images.length || 1).fill(true)
  );

  useEffect(() => {
    const validImages = images.filter(image => typeof image === 'string');
    const fallbackImages = validImages.length > 0 ? validImages : [noImage];

    setGalleryImages(fallbackImages);
    setLoadingImages(new Array(fallbackImages.length).fill(true));

    fallbackImages.forEach((src, index) => {
      const img = new window.Image();
      img.src = src;

      if (src === noImage && img.complete) {
        handleImageLoad(index);
      } else if (img.complete) {
        handleImageLoad(index);
      } else {
        img.onload = () => handleImageLoad(index);
      }
    });

    return () => {
      fallbackImages.forEach(() => {
        const img = new window.Image();
        img.onload = null;
      });
    };
  }, [images]);

  const handleImageLoad = (index: number) => {
    setLoadingImages(prev => prev.map((loading, i) => (i === index ? false : loading)));
  };

  const handleDelete = (fileName: string) => {
    if (fileName === noImage) {
      return;
    }

    const updatedImages = galleryImages.filter(image => !image.endsWith(fileName));
    const updatedLoading = updatedImages.map((_, i) => loadingImages[i]);

    setGalleryImages(updatedImages.length > 0 ? updatedImages : [noImage]);
    setLoadingImages(updatedLoading);

    if (viewMode === 'carousel') {
      setCurrentImageIndex(prevIndex => (prevIndex >= updatedImages.length ? 0 : prevIndex));
    }

    if (onDelete) {
      const fullUrl = galleryImages.find(image => image.endsWith(fileName));
      onDelete(fullUrl || fileName);
    }
  };

  const handleUpload = (file: File) => {
    if (galleryImages.length >= 3) {
      alert('Maximum limit of 3 images reached.');
      return;
    }
    if (onUpload) {
      onUpload(file);
    }
  };

  return (
    <>
      {viewMode === 'gallery' ? (
        <div className={galleryContainer}>
          {galleryImages.map((src, index) => {
            const fileName = typeof src === 'string' ? src.split('/').pop() : '';
            return (
              <div className={imageContainer} key={index}>
                {loadingImages[index] && <Spinner />}
                <img
                  src={src}
                  alt={`Gallery item ${index + 1}`}
                  className={galleryImage({ isLoading: loadingImages[index] })}
                  onLoad={() => handleImageLoad(index)}
                />
                {onDelete && src !== noImage && (
                  <button
                    className={deleteButton}
                    onClick={() => handleDelete(fileName!)}
                    aria-label={`delete image ${fileName}`}
                  >
                    delete image
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {galleryImages.length > 0 && (
            <div className={imageWrapper}>
              {loadingImages[currentImageIndex] && <Spinner />}
              <img
                src={galleryImages[currentImageIndex]}
                alt='Current gallery item'
                className={galleryImage({ isLoading: loadingImages[currentImageIndex] })}
                onLoad={() => handleImageLoad(currentImageIndex)}
              />
              {onDelete && galleryImages[currentImageIndex] !== noImage && (
                <button
                  className={deleteButton}
                  onClick={() => {
                    const currentImage = galleryImages[currentImageIndex];
                    const fileName =
                      typeof currentImage === 'string' ? currentImage.split('/').pop() : '';
                    if (fileName) {
                      handleDelete(fileName);
                    }
                  }}
                  aria-label={`delete image ${currentImageIndex + 1}`}
                >
                  delete image
                </button>
              )}
            </div>
          )}

          <div className={navigationDots}>
            {galleryImages.map((_, index) => (
              <button
                key={index}
                className={clsx(dot({ active: index === currentImageIndex }))}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`dot ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
      {onUpload && galleryImages.length < 3 && (
        <label className={uploadButton}>
          Upload Image
          <input
            className={hiddenInput}
            type='file'
            accept='image/*'
            onChange={event => {
              if (event.target.files && event.target.files[0]) {
                handleUpload(event.target.files[0]);
              }
            }}
          />
        </label>
      )}
      {onUpload && galleryImages.length === 3 && (
        <div className={centeredBadgeContainer}>
          <Badge variant='info'>Maximum amount of images reached</Badge>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
