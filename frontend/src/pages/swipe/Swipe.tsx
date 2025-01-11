import React, { useEffect, useState } from 'react'

// Third-party imports
import styled from 'styled-components'

// Internal imports
import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import {
  SwipeCardBackground,
  SwipeCardDefault,
  SwipeCardMinimal,
  SwipeCardNub,
} from './components'

// Style definitions
const SwipeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  position: relative;
  overflow: hidden;
`

const DefaultCard = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 300px;
  height: 400px;
  background-color: #f8f8f8;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  font-size: 24px;
  color: #555;
`

const ToggleButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  z-index: 1000;

  &:hover {
    background-color: #0056b3;
  }
`

// Types
type SwipeProps = {
  // No props needed for this component currently
}

type CardDesign = 'default' | 'background' | 'minimal' | 'nub'

export const Swipe: React.FC<SwipeProps> = () => {
  // State
  const [petCards, setPetCards] = useState<PetRescue[]>([])
  const [cardDesign, setCardDesign] = useState<CardDesign>('default')

  // Effects
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const fetchedPets = await PetsService.getAllPets()
        setPetCards(fetchedPets)
      } catch (error) {
        console.error('Error fetching pets:', error)
      }
    }

    fetchPets()
  }, [])

  // Event handlers
  const handleSwipe = (pet_id: string, direction: 'left' | 'right') => {
    setPetCards((prevCards) =>
      prevCards.filter((petCard) => petCard.pet_id !== pet_id),
    )
  }

  const toggleCardDesign = () => {
    setCardDesign((prevDesign) => {
      if (prevDesign === 'default') return 'background'
      if (prevDesign === 'background') return 'minimal'
      if (prevDesign === 'minimal') return 'nub'
      return 'default'
    })
  }

  // Helper functions
  const renderCard = () => {
    const currentCard = petCards[0]
    if (!currentCard) return <DefaultCard>No more pets available</DefaultCard>

    const safeCard = {
      ...currentCard,
      images: currentCard.images || [], // Ensure images is always an array
    }

    switch (cardDesign) {
      case 'background':
        return (
          <SwipeCardBackground
            key={currentCard.pet_id}
            card={safeCard}
            onSwipe={handleSwipe}
          />
        )
      case 'minimal':
        return (
          <SwipeCardMinimal
            key={currentCard.pet_id}
            card={safeCard}
            onSwipe={handleSwipe}
          />
        )
      case 'nub':
        return (
          <SwipeCardNub
            key={currentCard.pet_id}
            card={safeCard}
            onSwipe={handleSwipe}
          />
        )
      default:
        return (
          <SwipeCardDefault
            key={currentCard.pet_id}
            card={safeCard}
            onSwipe={handleSwipe}
          />
        )
    }
  }

  // Render
  return (
    <SwipeContainer>
      <ToggleButton onClick={toggleCardDesign}>
        Toggle Card Design (Current: {cardDesign})
      </ToggleButton>
      {renderCard()}
    </SwipeContainer>
  )
}
