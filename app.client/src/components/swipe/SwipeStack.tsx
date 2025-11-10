import { DiscoveryPet, SwipeAction } from '@/services';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { SwipeCard } from './SwipeCard';

interface SwipeStackProps {
  pets: DiscoveryPet[];
  onSwipe: (action: SwipeAction) => void;
  onEndReached: () => void;
  sessionId?: string;
  className?: string;
  disabled?: boolean;
}

const StackContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 600px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    height: 70vh;
    max-width: 90vw;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #666;
  padding: 2rem;
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #333;
`;

const EmptyText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  max-width: 300px;
`;

const VISIBLE_CARDS = 3;
const CARD_SCALE_STEP = 0.05;
const CARD_Y_OFFSET = 8;

export const SwipeStack: React.FC<SwipeStackProps> = ({
  pets,
  onSwipe,
  onEndReached,
  sessionId = '',
  className,
  disabled = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = useCallback(
    (action: 'like' | 'pass' | 'super_like' | 'info', petId: string) => {
      const pet = pets.find(p => p.petId === petId);
      if (!pet) return;

      const swipeAction: SwipeAction = {
        action,
        petId,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
      };

      onSwipe(swipeAction);

      // Move to next pet
      setCurrentIndex(prev => prev + 1);

      // Check if we need more pets
      if (currentIndex + VISIBLE_CARDS >= pets.length) {
        onEndReached();
      }
    },
    [pets, currentIndex, onSwipe, onEndReached, sessionId]
  );

  // Reset when pets change
  useEffect(() => {
    setCurrentIndex(0);
  }, [pets]);

  const visiblePets = pets.slice(currentIndex, currentIndex + VISIBLE_CARDS);

  if (pets.length === 0) {
    return (
      <StackContainer className={className}>
        <EmptyState>
          <EmptyIcon>🐾</EmptyIcon>
          <EmptyTitle>No more pets to discover</EmptyTitle>
          <EmptyText>
            Try adjusting your filters or check back later for new pets looking for homes!
          </EmptyText>
        </EmptyState>
      </StackContainer>
    );
  }

  if (currentIndex >= pets.length) {
    return (
      <StackContainer className={className}>
        <EmptyState>
          <EmptyIcon>✨</EmptyIcon>
          <EmptyTitle>You&apos;ve seen all the pets!</EmptyTitle>
          <EmptyText>
            Great job exploring! New pets are added regularly, so check back soon.
          </EmptyText>
        </EmptyState>
      </StackContainer>
    );
  }

  return (
    <StackContainer className={className}>
      {visiblePets.map((pet, index) => {
        const isTop = index === 0;
        const zIndex = VISIBLE_CARDS - index;
        const scale = 1 - index * CARD_SCALE_STEP;
        const yOffset = index * CARD_Y_OFFSET;

        return (
          <SwipeCard
            key={pet.petId}
            pet={pet}
            onSwipe={handleSwipe}
            isTop={isTop}
            zIndex={zIndex}
            disabled={disabled}
            style={{
              transform: `scale(${scale}) translateY(${yOffset}px)`,
              transformOrigin: 'center bottom',
            }}
          />
        );
      })}
    </StackContainer>
  );
};
