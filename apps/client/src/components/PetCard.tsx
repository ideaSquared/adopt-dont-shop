import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useStatsig } from '@/hooks/useStatsig';
import { Pet } from '@/services';
import { Button, Card, PetImage, StatusBadge } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import { Heart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router';
import { formatAge } from '@adopt-dont-shop/lib.pets';
import { resolveFileUrl } from '@adopt-dont-shop/lib.utils';
import { LoginPromptModal } from './modals/LoginPromptModal';
import * as styles from './PetCard.css';

interface PetCardProps {
  pet: Pet;
  showFavoriteButton?: boolean;
  onFavoriteToggle?: (petId: string, isFavorite: boolean) => void;
  isFavorite?: boolean; // Optional prop to override the favorites context
}

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  showFavoriteButton = true,
  onFavoriteToggle,
  isFavorite: propIsFavorite,
}) => {
  'use memo';
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { isAuthenticated } = useAuth();
  const favorites = useFavorites();
  const { logEvent } = useStatsig();
  const navigate = useNavigate();

  // Use prop if provided, otherwise check favorites context
  const isFavorite =
    propIsFavorite !== undefined ? propIsFavorite : favorites.isFavorite(pet.pet_id);

  const primaryPhoto = pet.images?.find(image => image.is_primary) || pet.images?.[0];
  const resolvedImageUrl = resolveFileUrl(primaryPhoto?.url);

  const handleCardClick = () => {
    logEvent('pet_card_clicked', 1, {
      pet_id: pet.pet_id,
      pet_name: pet.name,
      pet_type: pet.type ?? 'unknown',
      pet_breed: pet.breed || 'unknown',
      pet_age_years: pet.age_years?.toString() || 'unknown',
      pet_status: pet.status ?? 'unknown',
      has_image: (!!resolvedImageUrl).toString(),
      is_favorite: isFavorite.toString(),
    });
    navigate(`/pets/${pet.pet_id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Log unauthorized favorite attempt
      logEvent('pet_favorite_unauthorized', 1, {
        pet_id: pet.pet_id,
        pet_name: pet.name,
        pet_type: pet.type ?? 'unknown',
      });
      return;
    }

    // Optimistic: flip immediately via the context (which already does
    // its own optimistic update) and notify parent right away so the UI
    // feels instant. Revert the parent callback on error.
    const newFavorite = !isFavorite;
    onFavoriteToggle?.(pet.pet_id, newFavorite);

    try {
      if (isFavorite) {
        await favorites.removeFromFavorites(pet.pet_id);

        // Log favorite removal
        logEvent('pet_unfavorited', 1, {
          pet_id: pet.pet_id,
          pet_name: pet.name,
          pet_type: pet.type ?? 'unknown',
          pet_breed: pet.breed || 'unknown',
        });
      } else {
        await favorites.addToFavorites(pet.pet_id);

        // Log favorite addition
        logEvent('pet_favorited', 1, {
          pet_id: pet.pet_id,
          pet_name: pet.name,
          pet_type: pet.type ?? 'unknown',
          pet_breed: pet.breed || 'unknown',
        });
      }
    } catch (error) {
      // Revert the optimistic parent callback
      onFavoriteToggle?.(pet.pet_id, isFavorite);

      console.error('Failed to toggle favorite:', error);

      // Log favorite error
      logEvent('pet_favorite_error', 1, {
        pet_id: pet.pet_id,
        action: isFavorite ? 'remove' : 'add',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    // If authenticated, navigate to apply page
    navigate(`/apply/${pet.pet_id}`);
  };

  const handleCloseLoginPrompt = () => {
    setShowLoginPrompt(false);
  };

  // Pet schema fields are optional because different API responses return
  // different subsets (lib.pets/src/schemas.ts:55-57). Treat absent age,
  // size, and status as "Unknown" rather than crashing the card render.
  const formatSize = (size: string | undefined) => {
    if (!size) {
      return 'Unknown';
    }
    return size.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card
      onClick={handleCardClick}
      className={styles.styledCard}
      role='link'
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
    >
      <div className={styles.imageContainer}>
        <PetImage src={resolvedImageUrl} alt={pet.name} />

        <StatusBadge kind='pet' status={pet.status ?? 'unknown'} className={styles.statusBadge} />

        {pet.distance !== undefined && pet.distance !== null && (
          <div className={styles.distanceBadge}>
            <MapPin size={13} />
            {pet.distance.toFixed(1)} mi
          </div>
        )}

        {showFavoriteButton && isAuthenticated && (
          <Button
            variant='ghost'
            className={styles.favoriteButton}
            onClick={handleFavoriteClick}
            style={{ color: isFavorite ? '#ff6b6b' : '#ccc' }}
            aria-label={
              isFavorite ? `Remove ${pet.name} from favorites` : `Add ${pet.name} to favorites`
            }
          >
            {isFavorite ? <Heart size={24} fill='currentColor' /> : <Heart size={24} />}
          </Button>
        )}
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.petName}>{pet.name}</h3>

        <div className={styles.petDetails}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type:</span>
            <span className={styles.detailValue}>{pet.type}</span>
          </div>
          {pet.breed && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Breed:</span>
              <span className={styles.detailValue}>{pet.breed}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Age:</span>
            <span className={styles.detailValue}>{formatAge(pet.age_years, pet.age_months)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Size:</span>
            <span className={styles.detailValue}>{formatSize(pet.size)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Gender:</span>
            <span className={styles.detailValue}>{pet.gender}</span>
          </div>
        </div>

        {pet.short_description && <p className={styles.description}>{pet.short_description}</p>}

        {pet.rescue?.name && <div className={styles.rescueInfo}>From {pet.rescue.name}</div>}

        <div className={styles.cardActions}>
          <Button size='sm' variant='primary' className={styles.actionButton}>
            View Details
          </Button>
          {pet.status === 'available' && (
            <Button
              size='sm'
              variant='outline'
              className={styles.actionButton}
              onClick={handleApplyClick}
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={handleCloseLoginPrompt}
        action='apply for adoption'
      />
    </Card>
  );
};
