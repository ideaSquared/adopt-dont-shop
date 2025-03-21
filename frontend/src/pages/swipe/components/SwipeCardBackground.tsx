import { Pet } from '@adoptdontshop/libs/pets'
import { SwipeControls, useSwipe } from '@adoptdontshop/pages/swipe/components'
import React from 'react'
import styled, { css } from 'styled-components'
import noImage from './no-image.png'

type SwipeCardProps = {
  card: Pet
  onSwipe: (pet_id: string, direction: 'left' | 'right') => void
}

const Card = styled.div<{
  swipeDirection: 'left' | 'right' | null
  imageUrl: string
}>`
  position: relative;
  width: 90%;
  max-width: 300px;
  height: 450px;
  background-image: url(${({ imageUrl }) => imageUrl});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  color: white; /* Ensure text is visible on the image background */
  font-size: 16px;
  padding: 20px;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;

  ${({ swipeDirection }) =>
    swipeDirection === 'left' &&
    css`
      transform: translateX(-100%) rotate(-10deg);
      opacity: 0;
    `}

  ${({ swipeDirection }) =>
    swipeDirection === 'right' &&
    css`
      transform: translateX(100%) rotate(10deg);
      opacity: 0;
    `}

	@media (max-width: 768px) {
    height: 400px;
    padding: 15px;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    height: 350px;
    padding: 10px;
    font-size: 12px;
  }
`

const CardContent = styled.div`
  text-align: center;
  padding: 10px 0;
  flex-grow: 1;
  background: rgba(0, 0, 0, 0.5); /* Dark overlay for better text visibility */
  width: 100%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const CardTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  @media (max-width: 768px) {
    font-size: 20px;
  }
  @media (max-width: 480px) {
    font-size: 18px;
  }
`

const CardText = styled.p`
  margin: 5px 0;
  font-size: 16px;

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 480px) {
    font-size: 12px;
  }
`

const SwipeCard: React.FC<SwipeCardProps> = ({ card, onSwipe }) => {
  const { swipeDirection, handleSwipe } = useSwipe((direction) => {
    onSwipe(card.pet_id, direction)
  })

  const baseUrl = 'http://localhost:5000/api/uploads/'
  const imageUrl = card.images?.[0] ? `${baseUrl}${card.images[0]}` : noImage

  return (
    <Card swipeDirection={swipeDirection} imageUrl={imageUrl}>
      <CardContent>
        <CardTitle>{card.name}</CardTitle>
        <CardText>{card.breed}</CardText>
        <CardText>Age: {card.age} years</CardText>
        <CardText>{card.short_description}</CardText>
      </CardContent>
      <SwipeControls onSwipe={handleSwipe} />
    </Card>
  )
}

export default SwipeCard
