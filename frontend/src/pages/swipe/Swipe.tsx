import { PetRescue, PetsService } from '@adoptdontshop/libs/pets'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import {
  SwipeCardBackground,
  SwipeCardDefault,
  SwipeCardMinimal,
  SwipeCardNub,
} from './components/'

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
const Swipe: React.FC = () => {
  const [petCards, setPetCards] = useState<PetRescue[]>([])
  const [cardDesign, setCardDesign] = useState('default') // Default card design

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const fetchedPets = await PetsService.getPets()
        setPetCards(fetchedPets)
      } catch (error) {
        console.error('Error fetching pets:', error)
      }
    }

    fetchPets()
  }, [])

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

  const currentCard = petCards[0]

  const renderCard = () => {
    if (!currentCard) return <DefaultCard>No more pets available</DefaultCard>

    const safeCard = {
      ...currentCard,
      images: currentCard.images || [], // Ensure images is always an array
    }

    if (cardDesign === 'default') {
      return (
        <SwipeCardDefault
          key={currentCard.pet_id}
          card={safeCard}
          onSwipe={handleSwipe}
        />
      )
    }

    if (cardDesign === 'background') {
      return (
        <SwipeCardBackground
          key={currentCard.pet_id}
          card={safeCard}
          onSwipe={handleSwipe}
        />
      )
    }

    if (cardDesign === 'nub') {
      return (
        <SwipeCardNub
          key={currentCard.pet_id}
          card={safeCard}
          onSwipe={handleSwipe}
        />
      )
    }

    return (
      <SwipeCardMinimal
        key={currentCard.pet_id}
        card={safeCard}
        onSwipe={handleSwipe}
      />
    )
  }

  return (
    <SwipeContainer>
      <ToggleButton onClick={toggleCardDesign}>
        Toggle Card Design (Current: {cardDesign})
      </ToggleButton>
      {renderCard()}
    </SwipeContainer>
  )
}

export default Swipe
