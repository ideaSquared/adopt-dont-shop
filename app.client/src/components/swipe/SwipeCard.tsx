import { DiscoveryPet } from '@/types';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

interface SwipeCardProps {
  pet: DiscoveryPet;
  onSwipe: (action: 'like' | 'pass' | 'super_like' | 'info', petId: string) => void;
  isTop: boolean;
  zIndex: number;
  style?: React.CSSProperties;
}

const CardContainer = styled(animated.div)<{ $isTop: boolean }>`
  position: absolute;
  width: 100%;
  max-width: 350px;
  height: 600px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  cursor: ${props => (props.$isTop ? 'grab' : 'default')};
  user-select: none;
  overflow: hidden;
  will-change: transform;

  &:active {
    cursor: ${props => (props.$isTop ? 'grabbing' : 'default')};
  }

  @media (max-width: 768px) {
    max-width: 90vw;
    height: 70vh;
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 70%;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PlaceholderImage = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.3;
  }

  &::after {
    content: 'No Photo Available';
    position: absolute;
    bottom: 20px;
    font-size: 0.9rem;
    opacity: 0.8;
    color: #666;
  }
`;

const SwipeOverlay = styled(animated.div)<{ $action: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: white;
  font-weight: bold;
  border: 4px solid white;
  background: ${props => {
    switch (props.$action) {
      case 'like':
        return 'rgba(76, 217, 100, 0.9)';
      case 'pass':
        return 'rgba(255, 59, 92, 0.9)';
      case 'super_like':
        return 'rgba(0, 149, 246, 0.9)';
      case 'info':
        return 'rgba(255, 193, 7, 0.9)';
      default:
        return 'transparent';
    }
  }};
  z-index: 10;
`;

const CardContent = styled.div`
  padding: 20px;
  height: 30%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const PetName = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #333;
`;

const PetDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  color: #666;
`;

const Badge = styled.span<{ $variant: 'age' | 'size' | 'breed' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.$variant) {
      case 'age':
        return '#e3f2fd';
      case 'size':
        return '#f3e5f5';
      case 'breed':
        return '#e8f5e8';
      default:
        return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'age':
        return '#1976d2';
      case 'size':
        return '#7b1fa2';
      case 'breed':
        return '#388e3c';
      default:
        return '#666';
    }
  }};
`;

const SWIPE_THRESHOLD = 100;
const ROTATION_MULTIPLIER = 0.1;

export const SwipeCard: React.FC<SwipeCardProps> = ({ pet, onSwipe, isTop, zIndex, style }) => {
  const [overlayAction, setOverlayAction] = useState<string>('');
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isTop) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onSwipe('pass', pet.petId);
          break;
        case 'ArrowRight':
          event.preventDefault();
          onSwipe('like', pet.petId);
          break;
        case 'ArrowUp':
          event.preventDefault();
          onSwipe('super_like', pet.petId);
          break;
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          event.preventDefault();
          navigate(`/pets/${pet.petId}`);
          break;
        case 'Escape':
          event.preventDefault();
          onSwipe('pass', pet.petId);
          break;
      }
    },
    [isTop, onSwipe, pet.petId, navigate]
  );

  const [{ x, y, rotate, scale, opacity }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
    config: { tension: 300, friction: 30 },
  }));

  const [overlaySpring, overlayApi] = useSpring(() => ({
    opacity: 0,
    scale: 0.8,
    config: { tension: 400, friction: 25 },
  }));

  const bind = useDrag(
    ({
      active,
      movement: [mx, my],
      velocity: [vx],
      direction: [dx],
      cancel,
    }: {
      active: boolean;
      movement: [number, number];
      velocity: [number, number];
      direction: [number, number];
      cancel?: () => void;
    }) => {
      if (!isTop) return;

      const trigger = Math.abs(mx) > SWIPE_THRESHOLD;
      const isFlick = Math.abs(vx) > 0.5;

      let action = '';
      if (Math.abs(mx) > 50) {
        if (mx > 0) action = 'like';
        else action = 'pass';
      } else if (my < -50) {
        action = 'super_like';
      } else if (my > 50) {
        action = 'info';
      }

      // Update overlay
      if (active && action !== overlayAction) {
        setOverlayAction(action);
        overlayApi.start({
          opacity: action ? 1 : 0,
          scale: action ? 1 : 0.8,
        });
      }

      if (active) {
        // Card follows the drag
        api.start({
          x: mx,
          y: my,
          rotate: mx * ROTATION_MULTIPLIER,
          scale: 1.05,
          immediate: true,
        });
      } else {
        // Released
        overlayApi.start({ opacity: 0, scale: 0.8 });
        setOverlayAction('');

        if (trigger || isFlick) {
          // Handle special actions based on movement patterns
          let finalAction: 'like' | 'pass' | 'super_like' | 'info';
          if (overlayAction === 'info' && my > 50) {
            // Navigate to pet details instead of swiping away
            navigate(`/pets/${pet.petId}`);
            // Reset card position
            api.start({
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              opacity: 1,
            });
            return;
          } else if (overlayAction === 'super_like' && my < -50) {
            finalAction = 'super_like';
          } else {
            // Regular horizontal swipe
            finalAction = mx > 0 ? 'like' : 'pass';
          }

          // Animate card off screen
          api.start({
            x: dx * 1000,
            y: my + dx * 1000 * 0.1,
            rotate: dx * 30,
            scale: 0.8,
            opacity: 0,
            config: { tension: 200, friction: 20 },
          });

          // Trigger callback after a short delay
          setTimeout(() => {
            onSwipe(finalAction, pet.petId);
          }, 100);

          if (cancel) cancel();
        } else {
          // Return to center
          api.start({
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
          });
        }
      }
    },
    {
      axis: undefined,
      bounds: { left: -300, right: 300, top: -200, bottom: 200 },
      rubberband: true,
    }
  );

  const primaryImage = pet.images?.[0];

  // Calculate age display - handle undefined values properly
  let age = '';
  if (pet.ageYears && pet.ageYears > 0) {
    age = `${pet.ageYears}y`;
  } else if (pet.ageMonths && pet.ageMonths > 0) {
    age = `${pet.ageMonths}m`;
  } else {
    // Fallback to age group if specific age not available
    age = pet.ageGroup || 'Unknown age';
  }

  return (
    <CardContainer
      ref={cardRef}
      {...bind()}
      $isTop={isTop}
      tabIndex={isTop ? 0 : -1}
      onKeyDown={handleKeyDown}
      role='button'
      aria-label={`${pet.name}, ${pet.breed}, ${age} old. Use arrow keys to swipe or Enter to view details.`}
      style={{
        ...style,
        zIndex,
        transform: x.to(
          (x: number) =>
            `translateX(${x}px) translateY(${y.get()}px) rotate(${rotate.get()}deg) scale(${scale.get()})`
        ),
        opacity,
      }}
    >
      <ImageContainer>
        {primaryImage ? (
          <img src={primaryImage} alt={`${pet.name} - ${pet.breed || 'pet'}`} draggable={false} />
        ) : (
          <PlaceholderImage />
        )}

        <SwipeOverlay
          $action={overlayAction}
          style={{
            opacity: overlaySpring.opacity,
            transform: overlaySpring.scale.to(s => `translate(-50%, -50%) scale(${s})`),
          }}
        >
          {overlayAction === 'like' && '❤️'}
          {overlayAction === 'pass' && '❌'}
          {overlayAction === 'super_like' && '⭐'}
          {overlayAction === 'info' && 'ℹ️'}
        </SwipeOverlay>
      </ImageContainer>

      <CardContent>
        <div>
          <PetName>{pet.name}</PetName>
          <PetDetails>
            <DetailRow>
              <Badge $variant='age'>{age} old</Badge>
              <Badge $variant='size'>{pet.size}</Badge>
            </DetailRow>
            <DetailRow>
              <Badge $variant='breed'>{pet.breed}</Badge>
              <span>{pet.gender}</span>
            </DetailRow>
          </PetDetails>
        </div>
      </CardContent>
    </CardContainer>
  );
};
