import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Pet } from '@/types';
import { Badge, Button, Card } from '@adopt-dont-shop/components';
import React, { useState } from 'react';
import { MdFavorite, MdFavoriteBorder } from 'react-icons/md';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const StyledCard = styled(Card)`
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.05);
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
  overflow: hidden;

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

const FavoriteButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: white;
    transform: scale(1.1);
  }

  svg {
    width: 20px;
    height: 20px;
    fill: ${props => props.color || '#ccc'};
  }
`;

const StatusBadge = styled(Badge)`
  position: absolute;
  top: 12px;
  left: 12px;
`;

const CardContent = styled.div`
  padding: 1.5rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const PetName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.text.primary};
`;

const PetDetails = styled.div`
  margin-bottom: 1rem;
  flex-grow: 1;

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;

    .label {
      color: ${props => props.theme.text.secondary};
    }

    .value {
      font-weight: 500;
      color: ${props => props.theme.text.primary};
    }
  }
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.text.secondary};
  line-height: 1.4;
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
`;

const RescueInfo = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.text.secondary};
  margin-bottom: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};
`;

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
  const { isAuthenticated } = useAuth();
  const favorites = useFavorites();

  // Use prop if provided, otherwise check favorites context
  const isFavorite =
    propIsFavorite !== undefined ? propIsFavorite : favorites.isFavorite(pet.pet_id);

  const primaryPhoto = pet.images?.find(image => image.is_primary) || pet.images?.[0];

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Redirect to login or show login modal
      return;
    }

    setIsLoadingFavorite(true);

    try {
      if (isFavorite) {
        await favorites.removeFromFavorites(pet.pet_id);
        onFavoriteToggle?.(pet.pet_id, false);
      } else {
        await favorites.addToFavorites(pet.pet_id);
        onFavoriteToggle?.(pet.pet_id, true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Could show a toast notification here in the future
      // For now, just log the error - the favorites context handles the "already favorited" case
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const formatAge = (ageYears: number, ageMonths: number) => {
    if (ageYears === 0 && ageMonths === 0) return 'Unknown';
    if (ageYears === 0) return `${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
    if (ageMonths === 0) return `${ageYears} year${ageYears !== 1 ? 's' : ''}`;
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
    <StyledCard as={Link} to={`/pets/${pet.pet_id}`}>
      <ImageContainer>
        {primaryPhoto?.url ? (
          <>
            <img
              src={primaryPhoto.url}
              alt={pet.name}
              loading='lazy'
              onError={e => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
              }}
            />
            <PlaceholderImage style={{ display: 'none' }} />
          </>
        ) : (
          <PlaceholderImage />
        )}

        <StatusBadge variant={getStatusColor(pet.status)}>{getStatusLabel(pet.status)}</StatusBadge>

        {showFavoriteButton && isAuthenticated && (
          <FavoriteButton
            onClick={handleFavoriteClick}
            disabled={isLoadingFavorite}
            color={isFavorite ? '#ff6b6b' : '#ccc'}
          >
            {isFavorite ? <MdFavorite size={24} /> : <MdFavoriteBorder size={24} />}
          </FavoriteButton>
        )}
      </ImageContainer>

      <CardContent>
        <PetName>{pet.name}</PetName>

        <PetDetails>
          <div className='detail-row'>
            <span className='label'>Type:</span>
            <span className='value'>{pet.type}</span>
          </div>
          {pet.breed && (
            <div className='detail-row'>
              <span className='label'>Breed:</span>
              <span className='value'>{pet.breed}</span>
            </div>
          )}
          <div className='detail-row'>
            <span className='label'>Age:</span>
            <span className='value'>{formatAge(pet.age_years, pet.age_months)}</span>
          </div>
          <div className='detail-row'>
            <span className='label'>Size:</span>
            <span className='value'>{formatSize(pet.size)}</span>
          </div>
          <div className='detail-row'>
            <span className='label'>Gender:</span>
            <span className='value'>{pet.gender}</span>
          </div>
        </PetDetails>

        {pet.short_description && <Description>{pet.short_description}</Description>}

        {pet.rescue_id && (
          <RescueInfo>
            Rescue ID: {pet.rescue_id}
            {pet.location &&
              ` • Location: ${pet.location.coordinates[1]}, ${pet.location.coordinates[0]}`}
          </RescueInfo>
        )}

        <CardActions>
          <Button size='sm' variant='primary' style={{ flex: 1 }}>
            View Details
          </Button>
          {pet.status === 'available' && (
            <Button size='sm' variant='outline' style={{ flex: 1 }}>
              Apply
            </Button>
          )}
        </CardActions>
      </CardContent>
    </StyledCard>
  );
};
