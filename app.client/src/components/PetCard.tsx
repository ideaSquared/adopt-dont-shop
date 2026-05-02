import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useStatsig } from '@/hooks/useStatsig';
import { Pet } from '@/services';
import { Badge, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useState } from 'react';
import { MdFavorite, MdFavoriteBorder, MdLocationOn } from 'react-icons/md';
import { Link, useNavigate } from 'react-router-dom';
import { resolveFileUrl } from '../utils/fileUtils';
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
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
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
    // Log pet card click
    logEvent('pet_card_clicked', 1, {
      pet_id: pet.pet_id,
      pet_name: pet.name,
      pet_type: pet.type,
      pet_breed: pet.breed || 'unknown',
      pet_age_years: pet.age_years?.toString() || 'unknown',
      pet_status: pet.status,
      has_image: (!!resolvedImageUrl).toString(),
      is_favorite: isFavorite.toString(),
    });
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Log unauthorized favorite attempt
      logEvent('pet_favorite_unauthorized', 1, {
        pet_id: pet.pet_id,
        pet_name: pet.name,
        pet_type: pet.type,
      });
      return;
    }

    setIsLoadingFavorite(true);

    try {
      if (isFavorite) {
        await favorites.removeFromFavorites(pet.pet_id);
        onFavoriteToggle?.(pet.pet_id, false);

        // Log favorite removal
        logEvent('pet_unfavorited', 1, {
          pet_id: pet.pet_id,
          pet_name: pet.name,
          pet_type: pet.type,
          pet_breed: pet.breed || 'unknown',
        });
      } else {
        await favorites.addToFavorites(pet.pet_id);
        onFavoriteToggle?.(pet.pet_id, true);

        // Log favorite addition
        logEvent('pet_favorited', 1, {
          pet_id: pet.pet_id,
          pet_name: pet.name,
          pet_type: pet.type,
          pet_breed: pet.breed || 'unknown',
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);

      // Log favorite error
      logEvent('pet_favorite_error', 1, {
        pet_id: pet.pet_id,
        action: isFavorite ? 'remove' : 'add',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoadingFavorite(false);
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

  const formatAge = (ageYears: number, ageMonths: number) => {
    if (ageYears === 0 && ageMonths === 0) {
      return 'Unknown';
    }
    if (ageYears === 0) {
      return `${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
    }
    if (ageMonths === 0) {
      return `${ageYears} year${ageYears !== 1 ? 's' : ''}`;
    }
    return `${ageYears} year${ageYears !== 1 ? 's' : ''}, ${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
  };

  const formatSize = (size: string) => {
    return size.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'pending':
        return 'warning';
      case 'adopted':
        return 'info';
      case 'on_hold':
        return 'warning';
      case 'medical_care':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'pending':
        return 'Pending';
      case 'adopted':
        return 'Adopted';
      case 'on_hold':
        return 'On Hold';
      case 'medical_care':
        return 'Medical Care';
      default:
        return status;
    }
  };
  return (
    <Card
      as={Link}
      to={`/pets/${pet.pet_id}`}
      onClick={handleCardClick}
      className={styles.styledCard}
    >
      <div className={styles.imageContainer}>
        {resolvedImageUrl ? (
          <>
            <img
              src={resolvedImageUrl}
              alt={pet.name}
              loading='lazy'
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
              }}
            />
            <div className={styles.placeholderImage} style={{ display: 'none' }} />
          </>
        ) : (
          <div className={styles.placeholderImage} />
        )}

        <Badge variant={getStatusColor(pet.status)} className={styles.statusBadge}>
          {getStatusLabel(pet.status)}
        </Badge>

        {pet.distance !== undefined && pet.distance !== null && (
          <div className={styles.distanceBadge}>
            <MdLocationOn size={13} />
            {pet.distance} mi
          </div>
        )}

        {showFavoriteButton && isAuthenticated && (
          <button
            className={styles.favoriteButton}
            onClick={handleFavoriteClick}
            disabled={isLoadingFavorite}
            style={{ color: isFavorite ? '#ff6b6b' : '#ccc' }}
          >
            {isFavorite ? <MdFavorite size={24} /> : <MdFavoriteBorder size={24} />}
          </button>
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

        {pet.rescue_id && <div className={styles.rescueInfo}>Rescue ID: {pet.rescue_id}</div>}

        <div className={styles.cardActions}>
          <Button size='sm' variant='primary' style={{ flex: 1 }}>
            View Details
          </Button>
          {pet.status === 'available' && (
            <Button size='sm' variant='outline' style={{ flex: 1 }} onClick={handleApplyClick}>
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
