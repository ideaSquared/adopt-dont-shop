import { useImagePreloader } from '@/hooks/useImagePreloader';
import { DiscoveryPet, SwipeAction } from '@/services';
import { resolveFileUrl } from '@/utils/fileUtils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SwipeCard } from './SwipeCard';
import * as styles from './SwipeStack.css';

interface SwipeStackProps {
  pets: DiscoveryPet[];
  onSwipe: (action: SwipeAction) => void;
  onEndReached: () => void;
  sessionId?: string;
  className?: string;
  disabled?: boolean;
}

const VISIBLE_CARDS = 3;
const PRELOAD_AHEAD = 5;
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
      if (!pet) {
        return;
      }

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

  // Preload primary images for cards just past the visible window so the next
  // swipe shows the image instantly instead of fetching on-demand.
  const preloadUrls = useMemo(
    () =>
      pets
        .slice(currentIndex + VISIBLE_CARDS, currentIndex + VISIBLE_CARDS + PRELOAD_AHEAD)
        .map(pet => resolveFileUrl(pet.images?.[0]))
        .filter((url): url is string => Boolean(url)),
    [pets, currentIndex]
  );
  useImagePreloader(preloadUrls);

  if (pets.length === 0) {
    return (
      <div className={`${styles.stackContainer}${className ? ` ${className}` : ''}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🐾</div>
          <h3 className={styles.emptyTitle}>No more pets to discover</h3>
          <p className={styles.emptyText}>
            Try adjusting your filters or check back later for new pets looking for homes!
          </p>
        </div>
      </div>
    );
  }

  if (currentIndex >= pets.length) {
    return (
      <div className={`${styles.stackContainer}${className ? ` ${className}` : ''}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✨</div>
          <h3 className={styles.emptyTitle}>You&apos;ve seen all the pets!</h3>
          <p className={styles.emptyText}>
            Great job exploring! New pets are added regularly, so check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.stackContainer}${className ? ` ${className}` : ''}`}>
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
    </div>
  );
};
