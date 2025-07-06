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

const PlaceholderImage = styled.div<{ $isLoading?: boolean; $petName?: string; $petType?: string }>`
  width: 100%;
  height: 100%;
  background: ${props => {
    // Create a pet-type specific gradient
    switch (props.$petType) {
      case 'dog':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'cat':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'rabbit':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'bird':
        return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      default:
        return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
    }
  }};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  color: white;
  text-align: center;

  &::before {
    content: '';
    width: 80px;
    height: 80px;
    background-image: ${props =>
      props.$isLoading
        ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/%3E%3C/svg%3E\")"
        : props.$petType === 'dog'
          ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M4.5 12.5c0 .6.4 1 1 1s1-.4 1-1-.4-1-1-1-1 .4-1 1zm13 0c0 .6.4 1 1 1s1-.4 1-1-.4-1-1-1-1 .4-1 1zM12 17.5c-1.4 0-2.5-.9-2.9-2.1H7.9c.5 2.4 2.6 4.1 5.1 4.1s4.6-1.7 5.1-4.1h-1.2c-.4 1.2-1.5 2.1-2.9 2.1zm0-15C5.9 2.5 1 7.4 1 13.5S5.9 24.5 12 24.5s11-4.9 11-11S18.1 2.5 12 2.5z'/%3E%3C/svg%3E\")"
          : props.$petType === 'cat'
            ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l1.09 2.09L16 3l-1.09 1.09L16 6l-2.91-1.09L12 2zm-4.5 8.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S9.83 9 9 9s-1.5.67-1.5 1.5zm7 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S16.33 9 15.5 9s-1.5.67-1.5 1.5zM12 17.5c1.33 0 2.5-.87 2.5-2h-5c0 1.13 1.17 2 2.5 2z'/%3E%3C/svg%3E\")"
            : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E\")"};
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    margin-bottom: 20px;
    animation: ${props => (props.$isLoading ? 'spin 2s linear infinite' : 'none')};
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const PlaceholderText = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const PlaceholderSubtext = styled.div`
  font-size: 1rem;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Image loading handlers
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoaded(false);
    setImageError(true);
  }, []);

  // Reset image state when pet changes
  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [pet.petId]);

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

  // Create a fallback image URL for better reliability
  const getImageUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;

    // If it's a via.placeholder.com URL (which might not work), return undefined to use our own placeholder
    if (url.includes('via.placeholder.com') || url.includes('placeholder')) {
      return undefined;
    }

    // If it's a valid http/https URL, use it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If it's a relative path, you might want to prepend your base URL
    // For now, just return the URL as is
    return url;
  };

  const imageUrl = getImageUrl(primaryImage);

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
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`${pet.name} - ${pet.breed || 'pet'}`}
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                opacity: imageLoaded && !imageError ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
            {(!imageLoaded || imageError) && (
              <PlaceholderImage
                $isLoading={!imageError && !imageLoaded}
                $petName={pet.name}
                $petType={pet.type}
              >
                {!imageLoaded && !imageError ? (
                  <>
                    <PlaceholderText>Loading...</PlaceholderText>
                    <PlaceholderSubtext>{pet.name}</PlaceholderSubtext>
                  </>
                ) : (
                  <>
                    <PlaceholderText>{pet.name}</PlaceholderText>
                    <PlaceholderSubtext>{pet.breed || pet.type}</PlaceholderSubtext>
                  </>
                )}
              </PlaceholderImage>
            )}
          </>
        ) : (
          <PlaceholderImage $petName={pet.name} $petType={pet.type}>
            <PlaceholderText>{pet.name}</PlaceholderText>
            <PlaceholderSubtext>{pet.breed || pet.type}</PlaceholderSubtext>
          </PlaceholderImage>
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
