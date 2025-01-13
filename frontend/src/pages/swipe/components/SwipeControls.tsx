import React from 'react'
import styled from 'styled-components'

type SwipeControlsProps = {
  onSwipe: (direction: 'left' | 'right') => void
}

const ControlContainer = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  padding-top: 10px;

  @media (max-width: 768px) {
    padding-top: 8px;
  }

  @media (max-width: 480px) {
    padding-top: 5px;
  }
`

const ControlButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #eee;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #ddd;
  }

  @media (max-width: 768px) {
    padding: 8px 15px;
  }

  @media (max-width: 480px) {
    padding: 5px 10px;
    font-size: 12px;
  }
`

const SwipeControls: React.FC<SwipeControlsProps> = ({ onSwipe }) => {
  return (
    <ControlContainer>
      <ControlButton onClick={() => onSwipe('left')}>Dislike</ControlButton>
      <ControlButton onClick={() => onSwipe('right')}>Like</ControlButton>
      <ControlButton onClick={() => onSwipe('right')}>Love</ControlButton>
    </ControlContainer>
  )
}

export default SwipeControls
