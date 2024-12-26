import React, { useState } from 'react'
import styled from 'styled-components'

interface ImageGalleryProps {
  images: string[]
  viewMode: 'carousel' | 'gallery' // Toggle between carousel and gallery view
  onUpload?: (file: File) => void
  onDelete?: (index: number) => void
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

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
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
  const [galleryImages, setGalleryImages] = useState<string[]>(images)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      const reader = new FileReader()

      reader.onload = () => {
        if (reader.result && typeof reader.result === 'string') {
          setGalleryImages([...galleryImages, reader.result])
          if (onUpload) onUpload(file)
        }
      }

      reader.readAsDataURL(file)
    }
  }

  const handleDelete = (index: number) => {
    const updatedImages = galleryImages.filter((_, i) => i !== index)
    setGalleryImages(updatedImages)

    if (viewMode === 'carousel') {
      setCurrentImageIndex((prevIndex) =>
        prevIndex >= updatedImages.length ? 0 : prevIndex,
      )
    }

    if (onDelete) onDelete(index)
  }

  const handleDotClick = (index: number) => {
    setCurrentImageIndex(index)
  }

  return (
    <>
      {viewMode === 'gallery' ? (
        <GalleryContainer>
          {galleryImages.map((src, index) => (
            <ImageContainer key={index}>
              <Image src={src} alt={`Image ${index + 1}`} />
              {onDelete && (
                <DeleteButton onClick={() => handleDelete(index)}>
                  x
                </DeleteButton>
              )}
            </ImageContainer>
          ))}
        </GalleryContainer>
      ) : (
        <>
          {galleryImages.length > 0 && (
            <ImageWrapper>
              <Image
                src={galleryImages[currentImageIndex]}
                alt="Gallery Image"
              />
              {onDelete && (
                <DeleteButton onClick={() => handleDelete(currentImageIndex)}>
                  x
                </DeleteButton>
              )}
            </ImageWrapper>
          )}
          <NavigationDots>
            {galleryImages.map((_, index) => (
              <Dot
                key={index}
                active={index === currentImageIndex}
                onClick={() => handleDotClick(index)}
              />
            ))}
          </NavigationDots>
        </>
      )}
      {onUpload && (
        <UploadButton>
          Upload Image
          <HiddenInput type="file" accept="image/*" onChange={handleUpload} />
        </UploadButton>
      )}
    </>
  )
}

export default ImageGallery
