import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { Spinner } from '../'
import noImage from './no-image.png' // Import your fallback image

interface ImageGalleryProps {
  images: string[]
  viewMode: 'carousel' | 'gallery'
  onUpload?: (file: File) => void
  onDelete?: (fileName: string) => void
}

const GalleryContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin: 20px;
`

const ImageContainer = styled.div`
  position: relative;
  width: 150px;
  height: 150px;
`

const ImageWrapper = styled.div`
  position: relative;
  width: 300px;
  height: 300px;
  margin: 20px auto;
`

const Image = styled.img<{ loading: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  opacity: ${({ loading }) => (loading ? 0 : 1)};
  transition: opacity 0.3s ease-in-out;
`

const DeleteButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 0, 0, 0.8);
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  &:hover {
    background-color: red;
  }
`

const NavigationDots = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`

const Dot = styled.button<{ active: boolean }>`
  width: 12px;
  height: 12px;
  margin: 0 5px;
  background-color: ${({ active }) => (active ? '#007bff' : '#ccc')};
  border: none;
  border-radius: 50%;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`

const UploadButton = styled.label`
  display: block;
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  margin: 20px auto;
  text-align: center;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    background-color: #0056b3;
  }
`

const HiddenInput = styled.input`
  display: none;
`

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  viewMode,
  onUpload,
  onDelete,
}) => {
  const [galleryImages, setGalleryImages] = useState<string[]>(
    images.length > 0 ? images : [noImage],
  )
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loadingImages, setLoadingImages] = useState<boolean[]>(
    new Array(images.length || 1).fill(true),
  )

  useEffect(() => {
    const validImages = images.filter((image) => typeof image === 'string')
    setGalleryImages(validImages.length > 0 ? validImages : [noImage])
    setLoadingImages(new Array(validImages.length || 1).fill(true))
  }, [images])

  const handleDelete = (fileName: string) => {
    if (fileName === noImage) return

    const updatedImages = galleryImages.filter(
      (image) => !image.endsWith(fileName),
    )
    const updatedLoading = updatedImages.map((_, i) => loadingImages[i])

    setGalleryImages(updatedImages.length > 0 ? updatedImages : [noImage])
    setLoadingImages(updatedLoading)

    if (viewMode === 'carousel') {
      setCurrentImageIndex((prevIndex) =>
        prevIndex >= updatedImages.length ? 0 : prevIndex,
      )
    }

    if (onDelete) onDelete(fileName)
  }

  const handleImageLoad = (index: number) => {
    setLoadingImages((prev) => {
      const newLoadingState = [...prev]
      newLoadingState[index] = false
      return newLoadingState
    })
  }

  return (
    <>
      {viewMode === 'gallery' ? (
        <GalleryContainer>
          {galleryImages.map((src, index) => {
            const fileName = typeof src === 'string' ? src.split('/').pop() : ''
            return (
              <ImageContainer key={index}>
                <Image
                  src={src}
                  alt={`Image ${index + 1}`}
                  loading={loadingImages[index]}
                  onLoad={() => handleImageLoad(index)}
                />
                {onDelete && fileName !== noImage && (
                  <DeleteButton
                    onClick={() => handleDelete(fileName!)}
                    aria-label={`delete image ${fileName}`}
                  >
                    delete image
                  </DeleteButton>
                )}
              </ImageContainer>
            )
          })}
        </GalleryContainer>
      ) : (
        <>
          {galleryImages.length > 0 && (
            <ImageWrapper>
              {loadingImages[currentImageIndex] && <Spinner />}
              <Image
                src={galleryImages[currentImageIndex]}
                alt="Gallery Image"
                loading={loadingImages[currentImageIndex]}
                onLoad={() => handleImageLoad(currentImageIndex)}
              />
              {onDelete && (
                <DeleteButton
                  onClick={() => {
                    const currentImage = galleryImages[currentImageIndex]
                    const fileName =
                      typeof currentImage === 'string'
                        ? currentImage.split('/').pop()
                        : ''
                    if (fileName) handleDelete(fileName)
                  }}
                  aria-label={`delete image ${currentImageIndex + 1}`}
                >
                  delete image
                </DeleteButton>
              )}
            </ImageWrapper>
          )}

          <NavigationDots>
            {galleryImages.map((_, index) => (
              <Dot
                key={index}
                active={index === currentImageIndex}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`dot ${index + 1}`}
              />
            ))}
          </NavigationDots>
        </>
      )}
      {onUpload && (
        <UploadButton>
          Upload Image
          <HiddenInput
            type="file"
            accept="image/*"
            onChange={(event) => {
              if (event.target.files && event.target.files[0]) {
                onUpload(event.target.files[0])
              }
            }}
          />
        </UploadButton>
      )}
    </>
  )
}

export default ImageGallery
