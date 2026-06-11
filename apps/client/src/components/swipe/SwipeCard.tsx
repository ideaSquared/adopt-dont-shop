import { useStatsig } from '@/hooks/useStatsig';
import { DiscoveryPet } from '@/services';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { MatchReasonChips, ProgressiveImage } from '@adopt-dont-shop/lib.components';
import { animated, to, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import React, { useCallback, useRef, useState } from 'react';
import {
  MdCheckCircle,
  MdExpandLess,
  MdLocationOn,
  MdLock,
  MdPets,
  MdRefresh,
  MdStar,
} from 'react-icons/md';
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
const ROTATION_MULTIPLIER = 0.08;
const STAMP_FADE_DISTANCE = 120;

const formatAge = (pet: DiscoveryPet): string => {
  if (pet.ageYears && pet.ageYears > 0) {
    return `${pet.ageYears} yr${pet.ageYears > 1 ? 's' : ''}`;
  }
  if (pet.ageMonths && pet.ageMonths > 0) {
    return `${pet.ageMonths} mo`;
  }
  return pet.ageGroup ?? '';
};

const formatDistance = (distance?: number): string | null => {
  if (distance === undefined || distance === null) {
    return null;
  }
  if (distance < 1) {
    return '< 1 mi';
  }
  return `${Math.round(distance)} mi away`;
};

const sizeLabels: Record<string, string> = {
  extra_small: 'XS',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  extra_large: 'XL',
};

type MatchTier = { label: string; variant: 'pawfect' | 'match' };

// Score is 0..100 from the backend. Hide low scores so badges feel meaningful
// (dating-app pattern: only highlight standouts).
const getMatchTier = (score: number | null): MatchTier | null => {
  if (score === null || score < 70) return null;
  if (score >= 90) return { label: 'Pawfect Match', variant: 'pawfect' };
  return { label: 'Great Match', variant: 'match' };
};

export const SwipeCard: React.FC<SwipeCardProps> = ({
  pet,
  onSwipe,
  isTop,
  zIndex,
  style,
  disabled = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logEvent } = useStatsig();
  const { isAuthenticated } = useAuth();
  const [imageIndex, setImageIndex] = useState(0);

  const openSignup = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      logEvent('swipe_match_teaser_clicked', 1, {
        pet_id: pet.petId,
        pet_name: pet.name || 'unknown',
      });
      navigate('/register');
    },
    [logEvent, navigate, pet.petId, pet.name]
  );

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

  // ADS-632: log activity-label impressions when the card is on top so
  // the planned A/B can compare like-rate on cards with vs. without
  // a label.
  React.useEffect(() => {
    if (!isTop || !pet.activityLabel) {
      return;
    }
    logEvent('card_activity_label_shown', 1, {
      pet_id: pet.petId,
      label_kind: pet.activityLabel.kind,
    });
  }, [isTop, pet.petId, pet.activityLabel, logEvent]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isTop) {
        return;
      }
      let action = '';
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (disabled) return;
          action = 'pass';
          onSwipe('pass', pet.petId);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (disabled) return;
          action = 'like';
          onSwipe('like', pet.petId);
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (disabled) return;
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
          if (disabled) return;
          action = 'pass';
          onSwipe('pass', pet.petId);
          break;
      }
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

  const [{ x, y, rotate, opacity }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    config: { tension: 300, friction: 30 },
  }));

  // Live drag stamp opacities (computed from x/y in a derived style)
  const likeOpacity = to([x], (vx: number) => Math.min(1, Math.max(0, vx / STAMP_FADE_DISTANCE)));
  const passOpacity = to([x], (vx: number) => Math.min(1, Math.max(0, -vx / STAMP_FADE_DISTANCE)));
  const superOpacity = to([x, y], (vx: number, vy: number) => {
    if (Math.abs(vx) > 60) return 0;
    return Math.min(1, Math.max(0, -vy / STAMP_FADE_DISTANCE));
  });

  const bind = useDrag(
    ({
      active,
      movement: [mx, my],
      velocity: [vx],
      direction: [dx],
      cancel,
      tap,
    }: {
      active: boolean;
      movement: [number, number];
      velocity: [number, number];
      direction: [number, number];
      cancel?: () => void;
      tap?: boolean;
    }) => {
      if (!isTop || disabled || tap) {
        return;
      }

      const trigger = Math.abs(mx) > SWIPE_THRESHOLD;
      const isSuperGesture = my < -SWIPE_THRESHOLD && Math.abs(mx) < 60;
      const isFlick = Math.abs(vx) > 0.5;

      if (active) {
        api.start({
          x: mx,
          y: my,
          rotate: mx * ROTATION_MULTIPLIER,
          immediate: true,
        });
      } else {
        if (trigger || isFlick || isSuperGesture) {
          let finalAction: 'like' | 'pass' | 'super_like';
          if (isSuperGesture) {
            finalAction = 'super_like';
          } else {
            finalAction = mx > 0 ? 'like' : 'pass';
          }

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

          const exitX = finalAction === 'pass' ? -800 : finalAction === 'like' ? 800 : 0;
          const exitY = finalAction === 'super_like' ? -900 : my * 0.5;

          api.start({
            x: exitX,
            y: exitY,
            rotate: finalAction === 'super_like' ? 0 : dx * 25,
            opacity: 0,
            config: { tension: 220, friction: 24 },
          });

          setTimeout(() => onSwipe(finalAction, pet.petId), 120);
          if (cancel) cancel();
        } else {
          api.start({ x: 0, y: 0, rotate: 0, opacity: 1 });
        }
      }
    },
    {
      filterTaps: true,
      bounds: { left: -400, right: 400, top: -300, bottom: 200 },
      rubberband: 0.15,
    }
  );

  const images = pet.images && pet.images.length > 0 ? pet.images : [];
  const currentImage = images[imageIndex];
  const imageUrl = resolveFileUrl(currentImage);
  const hasMultipleImages = images.length > 1;

  const cycleImage = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setImageIndex(prev => (prev + delta + images.length) % images.length);
  };

  const openDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    logEvent('swipe_pet_details_viewed', 1, {
      pet_id: pet.petId,
      pet_name: pet.name || 'unknown',
      pet_type: pet.type || 'unknown',
      interaction_method: 'info_button',
    });
    navigate(`/pets/${pet.petId}`);
  };

  const age = formatAge(pet);
  const distanceLabel = formatDistance(pet.distance);
  const compatibilityScore =
    pet.compatibilityScore !== undefined && pet.compatibilityScore !== null
      ? pet.compatibilityScore
      : null;
  const matchTier = getMatchTier(compatibilityScore);
  const placeholderBackground =
    petTypeGradients[pet.type ?? ''] ?? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';

  return (
    <animated.div
      ref={cardRef}
      {...(disabled || !isTop ? {} : bind())}
      className={styles.cardContainer({ isTop, disabled })}
      tabIndex={isTop ? 0 : -1}
      onKeyDown={handleKeyDown}
      role='button'
      aria-label={`${pet.name}, ${pet.breed ?? pet.type}, ${age}. Swipe right to like, left to pass, up to super like, or press Enter for details.`}
      style={{
        ...style,
        zIndex,
        transform: to(
          [x, y, rotate],
          (vx, vy, vr) => `translate3d(${vx}px, ${vy}px, 0) rotate(${vr}deg)`
        ),
        opacity,
      }}
    >
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <ProgressiveImage
            src={imageUrl}
            alt={`${pet.name} - ${pet.breed || 'pet'}`}
            eager={isTop}
            placeholder={
              <div
                className={styles.placeholderImage}
                style={{ background: placeholderBackground }}
              >
                <PlaceholderIcon isLoading petType={pet.type} />
                <div className={styles.placeholderText}>Loading...</div>
                <div className={styles.placeholderSubtext}>{pet.name}</div>
              </div>
            }
            errorFallback={
              <div
                className={styles.placeholderImage}
                style={{ background: placeholderBackground }}
                role='img'
                aria-label={`${pet.name} image unavailable`}
              >
                <PlaceholderIcon petType={pet.type} />
                <div className={styles.placeholderText}>{pet.name}</div>
                <div className={styles.placeholderSubtext}>{pet.breed || pet.type}</div>
              </div>
            }
          />
        ) : (
          <div className={styles.placeholderImage} style={{ background: placeholderBackground }}>
            <PlaceholderIcon petType={pet.type} />
            <div className={styles.placeholderText}>{pet.name}</div>
            <div className={styles.placeholderSubtext}>{pet.breed || pet.type}</div>
          </div>
        )}

        <div className={styles.gradientScrim} />

        {hasMultipleImages && (
          <>
            <div className={styles.imageDots} aria-hidden='true'>
              {images.map((src, i) => (
                <div key={src + i} className={styles.imageDot({ active: i === imageIndex })} />
              ))}
            </div>
            {isTop && (
              <>
                <button
                  type='button'
                  className={styles.tapZone({ side: 'left' })}
                  onClick={cycleImage(-1)}
                  aria-label='Previous photo'
                  tabIndex={-1}
                />
                <button
                  type='button'
                  className={styles.tapZone({ side: 'right' })}
                  onClick={cycleImage(1)}
                  aria-label='Next photo'
                  tabIndex={-1}
                />
              </>
            )}
          </>
        )}

        {(pet.isSponsored ||
          !isAuthenticated ||
          matchTier !== null ||
          pet.activityLabel ||
          (pet.matchReasons && pet.matchReasons.length > 0)) && (
          <div className={styles.topBadges}>
            {!isAuthenticated ? (
              <button
                type='button'
                className={styles.topBadge({ variant: 'locked' })}
                onClick={openSignup}
                aria-label='Sign up to see your match score'
              >
                <MdLock /> See Your Match
              </button>
            ) : (
              matchTier && (
                <span className={styles.topBadge({ variant: matchTier.variant })}>
                  <MdStar /> {matchTier.label}
                </span>
              )
            )}
            {pet.isSponsored && (
              <span className={styles.topBadge({ variant: 'sponsored' })}>
                <MdStar /> Featured
              </span>
            )}
            {pet.activityLabel && (
              <span
                className={styles.activityLabel}
                data-testid='activity-label'
                data-label-kind={pet.activityLabel.kind}
              >
                {pet.activityLabel.icon ?? ''} {pet.activityLabel.text}
              </span>
            )}
            {pet.matchReasons && pet.matchReasons.length > 0 && (
              <MatchReasonChips reasons={pet.matchReasons} />
            )}
          </div>
        )}

        {isTop && (
          <>
            <animated.div
              className={styles.stamp({ variant: 'like' })}
              style={{ opacity: likeOpacity }}
              aria-hidden='true'
            >
              Like
            </animated.div>
            <animated.div
              className={styles.stamp({ variant: 'pass' })}
              style={{ opacity: passOpacity }}
              aria-hidden='true'
            >
              Nope
            </animated.div>
            <animated.div
              className={styles.stamp({ variant: 'super_like' })}
              style={{ opacity: superOpacity }}
              aria-hidden='true'
            >
              Super Like
            </animated.div>
          </>
        )}

        <div className={styles.cardContent}>
          <div className={styles.nameRow}>
            <h3 className={styles.petName}>{pet.name}</h3>
            {age && <span className={styles.petAge}>{age}</span>}
          </div>

          <div className={styles.metaRow}>
            {pet.breed && <span className={styles.metaItem}>{pet.breed}</span>}
            {pet.gender && pet.gender !== 'unknown' && (
              <>
                <span className={styles.metaDot} />
                <span className={styles.metaItem} style={{ textTransform: 'capitalize' }}>
                  {pet.gender}
                </span>
              </>
            )}
            {pet.size && (
              <>
                <span className={styles.metaDot} />
                <span className={styles.metaItem}>{sizeLabels[pet.size] ?? pet.size}</span>
              </>
            )}
          </div>

          {(pet.rescueName || distanceLabel) && (
            <div className={styles.metaRow}>
              {distanceLabel && (
                <span className={styles.metaItem}>
                  <MdLocationOn /> {distanceLabel}
                </span>
              )}
              {pet.rescueName && distanceLabel && <span className={styles.metaDot} />}
              {pet.rescueName && <span className={styles.metaItem}>{pet.rescueName}</span>}
            </div>
          )}

          {pet.shortDescription && <p className={styles.description}>{pet.shortDescription}</p>}
        </div>

        {isTop && (
          <button
            type='button'
            className={styles.infoButton}
            onClick={openDetails}
            aria-label={`View full details for ${pet.name}`}
          >
            <MdExpandLess />
          </button>
        )}
      </div>

      <div className={styles.loginPromptOverlay({ show: disabled && isTop })}>
        <div className={styles.promptIcon}>🐾</div>
        <h3 className={styles.promptTitle}>Join to Start Swiping!</h3>
        <p className={styles.promptText}>
          Create an account to like pets, save favorites, and find a companion.
        </p>
        <button className={styles.promptButton} onClick={() => onSwipe('like', pet.petId)}>
          Sign Up to Continue
        </button>
      </div>
    </animated.div>
  );
};
