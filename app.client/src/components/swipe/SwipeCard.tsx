import { useStatsig } from '@/hooks/useStatsig';
import { DiscoveryPet } from '@/services';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import React, { useCallback, useRef, useState } from 'react';
import { MdCheckCircle, MdPets, MdRefresh, MdStar } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { resolveFileUrl } from '../../utils/fileUtils';
import * as styles from './SwipeCard.css';

interface SwipeCardProps {
  pet: DiscoveryPet;
  onSwipe: (action: 'like' | 'pass' | 'super_like' | 'info', petId: string) => void;
  isTop: boolean;
  zIndex: number;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const petTypeGradients: Record<string, string> = {
  dog: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  cat: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  rabbit: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  bird: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
};

const overlayColors: Record<string, string> = {
  like: 'rgba(76, 217, 100, 0.9)',
  pass: 'rgba(255, 59, 92, 0.9)',
  super_like: 'rgba(0, 149, 246, 0.9)',
  info: 'rgba(255, 193, 7, 0.9)',
};

const PlaceholderIcon: React.FC<{ isLoading?: boolean; petType?: string }> = ({
  isLoading,
  petType,
}) => {
  if (isLoading) {
    return <MdRefresh className={styles.placeholderIconSpin} />;
  }

  switch (petType) {
    case 'dog':
      return <MdPets className='placeholder-icon' />;
    case 'cat':
      return <MdStar className='placeholder-icon' />;
    default:
      return <MdCheckCircle className='placeholder-icon' />;
  }
};

const SWIPE_THRESHOLD = 100;
const ROTATION_MULTIPLIER = 0.1;

export const SwipeCard: React.FC<SwipeCardProps> = ({
  pet,
  onSwipe,
  isTop,
  zIndex,
  style,
  disabled = false,
}) => {
  const [overlayAction, setOverlayAction] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logEvent } = useStatsig();

  // Log when card is displayed
  React.useEffect(() => {
    if (isTop) {
      logEvent('swipe_card_displayed', 1, {
        pet_id: pet.petId,
        pet_name: pet.name || 'unknown',
        pet_type: pet.type || 'unknown',
        pet_breed: pet.breed || 'unknown',
        has_image: pet.images && pet.images.length > 0 ? 'true' : 'false',
        card_position: 'top',
      });
    }
  }, [isTop, pet, logEvent]);

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
      if (!isTop) {
        return;
      }

      let action: string = '';
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (disabled) {
            return;
          }
          action = 'pass';
          onSwipe('pass', pet.petId);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (disabled) {
            return;
          }
          action = 'like';
          onSwipe('like', pet.petId);
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (disabled) {
            return;
          }
          action = 'super_like';
          onSwipe('super_like', pet.petId);
          break;
        case 'ArrowDown':
        case 'Enter':
        case ' ':
          event.preventDefault();
          action = 'info';
          logEvent('swipe_pet_details_viewed', 1, {
            pet_id: pet.petId,
            pet_name: pet.name || 'unknown',
            pet_type: pet.type || 'unknown',
            interaction_method: 'keyboard',
            key_pressed: event.key,
          });
          navigate(`/pets/${pet.petId}`);
          break;
        case 'Escape':
          event.preventDefault();
          if (disabled) {
            return;
          }
          action = 'pass';
          onSwipe('pass', pet.petId);
          break;
      }

      // Log keyboard interaction
      if (action) {
        logEvent('swipe_keyboard_action', 1, {
          pet_id: pet.petId,
          action,
          key_pressed: event.key,
          pet_name: pet.name || 'unknown',
        });
      }
    },
    [isTop, onSwipe, pet, navigate, logEvent, disabled]
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
      if (!isTop || disabled) {
        return;
      }

      const trigger = Math.abs(mx) > SWIPE_THRESHOLD;
      const isFlick = Math.abs(vx) > 0.5;

      let action = '';
      if (Math.abs(mx) > 50) {
        if (mx > 0) {
          action = 'like';
        } else {
          action = 'pass';
        }
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
            logEvent('swipe_pet_details_viewed', 1, {
              pet_id: pet.petId,
              pet_name: pet.name || 'unknown',
              pet_type: pet.type || 'unknown',
              interaction_method: 'swipe_down',
              movement_y: my.toString(),
            });
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

          // Log swipe action
          logEvent('swipe_action_performed', 1, {
            pet_id: pet.petId,
            pet_name: pet.name || 'unknown',
            pet_type: pet.type || 'unknown',
            pet_breed: pet.breed || 'unknown',
            action: finalAction,
            interaction_method: 'swipe',
            movement_x: mx.toString(),
            movement_y: my.toString(),
            velocity_x: vx.toString(),
            is_flick: isFlick.toString(),
          });

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

          if (cancel) {
            cancel();
          }
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

  const imageUrl = resolveFileUrl(primaryImage);

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

  const placeholderBackground =
    petTypeGradients[pet.type ?? ''] ?? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';

  return (
    <animated.div
      ref={cardRef}
      {...(disabled ? {} : bind())}
      className={styles.cardContainer({ isTop, disabled })}
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
      <div className={styles.imageContainer}>
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
              <div
                className={styles.placeholderImage}
                style={{ background: placeholderBackground }}
              >
                <PlaceholderIcon isLoading={!imageError && !imageLoaded} petType={pet.type} />
                {!imageLoaded && !imageError ? (
                  <>
                    <div className={styles.placeholderText}>Loading...</div>
                    <div className={styles.placeholderSubtext}>{pet.name}</div>
                  </>
                ) : (
                  <>
                    <div className={styles.placeholderText}>{pet.name}</div>
                    <div className={styles.placeholderSubtext}>{pet.breed || pet.type}</div>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.placeholderImage} style={{ background: placeholderBackground }}>
            <PlaceholderIcon petType={pet.type} />
            <div className={styles.placeholderText}>{pet.name}</div>
            <div className={styles.placeholderSubtext}>{pet.breed || pet.type}</div>
          </div>
        )}

        <animated.div
          className={styles.swipeOverlay}
          style={{
            opacity: overlaySpring.opacity,
            transform: overlaySpring.scale.to(s => `translate(-50%, -50%) scale(${s})`),
            background: overlayColors[overlayAction] ?? 'transparent',
          }}
        >
          {overlayAction === 'like' && '❤️'}
          {overlayAction === 'pass' && '❌'}
          {overlayAction === 'super_like' && '⭐'}
          {overlayAction === 'info' && 'ℹ️'}
        </animated.div>
      </div>

      <div className={styles.cardContent}>
        <div>
          <h3 className={styles.petName}>{pet.name}</h3>
          <div className={styles.petDetails}>
            <div className={styles.detailRow}>
              <span className={styles.badge({ variant: 'age' })}>{age} old</span>
              <span className={styles.badge({ variant: 'size' })}>{pet.size}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.badge({ variant: 'breed' })}>{pet.breed}</span>
              <span>{pet.gender}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.loginPromptOverlay({ show: disabled && isTop })}>
        <div className={styles.promptIcon}>🐾</div>
        <h3 className={styles.promptTitle}>Join to Start Swiping!</h3>
        <p className={styles.promptText}>
          Create an account to like pets, save favorites, and find your perfect companion.
        </p>
        <button className={styles.promptButton} onClick={() => onSwipe('like', pet.petId)}>
          Sign Up to Continue
        </button>
      </div>
    </animated.div>
  );
};
