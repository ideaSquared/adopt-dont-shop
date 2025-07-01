import { useAuth } from '@/contexts/AuthContext';
import { petService } from '@/services/petService';
import { Pet } from '@/types';
import { Badge, Button, Card } from '@adopt-dont-shop/components';
import React, { useState } from 'react';
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
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 1.2rem;
  font-weight: 500;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 60px;
    height: 60px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E")
      no-repeat center;
    mask-size: contain;
  }

  &::after {
    content: 'No Photo Available';
    position: absolute;
    bottom: 20px;
    font-size: 0.9rem;
    opacity: 0.8;
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
}

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  showFavoriteButton = true,
  onFavoriteToggle,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const { isAuthenticated } = useAuth();

  const primaryPhoto = pet.photos?.find(photo => photo.isPrimary) || pet.photos?.[0];

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
        await petService.removeFromFavorites(pet.petId);
        setIsFavorite(false);
        onFavoriteToggle?.(pet.petId, false);
      } else {
        await petService.addToFavorites(pet.petId);
        setIsFavorite(true);
        onFavoriteToggle?.(pet.petId, true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const formatAge = (age?: number) => {
    if (!age) return 'Unknown';
    if (age < 1) return `${Math.round(age * 12)} months`;
    return `${age} year${age !== 1 ? 's' : ''}`;
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
    <StyledCard as={Link} to={`/pets/${pet.petId}`}>
      <ImageContainer>
        {primaryPhoto?.url ? (
          <img src={primaryPhoto.url} alt={pet.name} loading='lazy' />
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
            <svg viewBox='0 0 24 24'>
              <path
                d={
                  isFavorite
                    ? 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
                    : 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z'
                }
              />
            </svg>
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
            <span className='value'>{formatAge(pet.age)}</span>
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

        {pet.description && <Description>{pet.description}</Description>}

        {pet.rescue && (
          <RescueInfo>
            Rescue: {pet.rescue.name}
            {pet.location && ` • ${pet.location}`}
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
