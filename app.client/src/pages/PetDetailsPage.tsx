import { useAuth } from '@/contexts/AuthContext';
import { petService } from '@/services/petService';
import { Pet } from '@/types';
import { Badge, Button, Card } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  margin-bottom: 2rem;
  text-decoration: none;
  color: ${props => props.theme.text.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.text.primary};
    border-color: ${props => props.theme.border.color.secondary};
    background: ${props => props.theme.background.secondary};
  }
`;

const ActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;

  &.primary {
    background: ${props => props.theme.colors.primary[500]};
    color: white;

    &:hover {
      background: ${props => props.theme.colors.primary[600]};
      transform: translateY(-1px);
    }
  }

  &.outline {
    background: transparent;
    color: ${props => props.theme.text.primary};
    border: 1px solid ${props => props.theme.border.color.primary};

    &:hover {
      background: ${props => props.theme.background.secondary};
      border-color: ${props => props.theme.border.color.secondary};
    }
  }

  &.large {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }
`;

const ErrorActionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: ${props => props.theme.colors.primary[500]};
  color: white;

  &:hover {
    background: ${props => props.theme.colors.primary[600]};
    transform: translateY(-1px);
  }
`;

const PetHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const PetTitle = styled.div`
  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: ${props => props.theme.text.primary};
  }

  .subtitle {
    font-size: 1.2rem;
    color: ${props => props.theme.text.secondary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const StatusSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const ImageSection = styled.div`
  .primary-image {
    width: 100%;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .thumbnail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.5rem;
    max-height: 200px;
    overflow-y: auto;

    .thumbnail {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: border-color 0.2s ease;

      &.active {
        border-color: ${props => props.theme.border.color.focus};
      }

      &:hover {
        border-color: ${props => props.theme.border.color.primary};
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
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
    width: 80px;
    height: 80px;
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

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &::before {
    content: '';
    width: 20px;
    height: 20px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.3;
  }
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const InfoCard = styled(Card)`
  padding: 2rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: ${props => props.theme.text.primary};
  }

  .info-grid {
    display: grid;
    gap: 1rem;

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid ${props => props.theme.border.color.primary};

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-weight: 500;
        color: ${props => props.theme.text.secondary};
      }

      .value {
        font-weight: 600;
        color: ${props => props.theme.text.primary};
      }
    }
  }
`;

const ActionCard = styled(Card)`
  padding: 2rem;
  text-align: center;

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: ${props => props.theme.text.primary};
  }

  .rescue-info {
    background: ${props => props.theme.background.secondary};
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;

    .rescue-name {
      font-weight: 600;
      color: ${props => props.theme.text.primary};
      margin-bottom: 0.25rem;
    }

    .rescue-location {
      font-size: 0.9rem;
      color: ${props => props.theme.text.secondary};
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
`;

const DescriptionCard = styled(Card)`
  padding: 2rem;
  grid-column: 1 / -1;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    line-height: 1.6;
    color: ${props => props.theme.text.secondary};
    white-space: pre-wrap;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  font-size: 1.1rem;
  color: ${props => props.theme.text.secondary};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.text.error};

  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 2rem;
  }
`;

interface PetDetailsPageProps {}

export const PetDetailsPage: React.FC<PetDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      if (!id) {
        setError('Pet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const petData = await petService.getPet(id);
        setPet(petData);

        // Check if pet is in favorites
        if (isAuthenticated) {
          try {
            const favoriteStatus = await petService.isFavorite(id);
            setIsFavorite(favoriteStatus);
          } catch (favoriteError) {
            console.warn('Failed to check favorite status:', favoriteError);
          }
        }
      } catch (err) {
        console.error('Failed to fetch pet:', err);
        setError('Failed to load pet details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPet();
  }, [id, isAuthenticated]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated || !pet) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await petService.removeFromFavorites(pet.petId);
        setIsFavorite(false);
      } else {
        await petService.addToFavorites(pet.petId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setFavoriteLoading(false);
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
        return 'Available for Adoption';
      case 'pending':
        return 'Adoption Pending';
      case 'adopted':
        return 'Adopted';
      case 'on_hold':
        return 'On Hold';
      case 'medical_care':
        return 'In Medical Care';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>Loading pet details...</LoadingContainer>
      </PageContainer>
    );
  }

  if (error || !pet) {
    return (
      <PageContainer>
        <ErrorContainer>
          <h2>Pet Not Found</h2>
          <p>{error || 'The pet you are looking for could not be found.'}</p>
          <ErrorActionLink to='/'>Back to Home</ErrorActionLink>
        </ErrorContainer>
      </PageContainer>
    );
  }

  const primaryPhoto = pet.photos?.[selectedImageIndex] || pet.photos?.[0];

  return (
    <PageContainer>
      <BackLink to='/'>← Back to Search</BackLink>

      <PetHeader>
        <PetTitle>
          <h1>{pet.name}</h1>
          <div className='subtitle'>
            <span>{pet.type}</span>
            {pet.breed && <span>• {pet.breed}</span>}
            <span>• {formatAge(pet.age)}</span>
            <span>• {pet.gender}</span>
            <span>• {formatSize(pet.size)}</span>
          </div>
        </PetTitle>
        <StatusSection>
          <Badge variant={getStatusColor(pet.status)}>{getStatusLabel(pet.status)}</Badge>
          {isAuthenticated && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
            >
              {isFavorite ? '♥ Favorited' : '♡ Add to Favorites'}
            </Button>
          )}
        </StatusSection>
      </PetHeader>

      <MainContent>
        <ImageSection>
          <div className='primary-image'>
            {primaryPhoto?.url ? (
              <img src={primaryPhoto.url} alt={pet.name} />
            ) : (
              <PlaceholderImage />
            )}
          </div>
          {pet.photos && pet.photos.length > 1 && (
            <div className='thumbnail-grid'>
              {pet.photos.map((photo, index) => (
                <div
                  key={photo.photoId}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedImageIndex(index);
                    }
                  }}
                  role='button'
                  tabIndex={0}
                  aria-label={`View photo ${index + 1} of ${pet.name}`}
                >
                  {photo.url ? (
                    <img src={photo.url} alt={`${pet.name} ${index + 1}`} />
                  ) : (
                    <ThumbnailPlaceholder />
                  )}
                </div>
              ))}
            </div>
          )}
        </ImageSection>

        <Sidebar>
          <InfoCard>
            <h2>Pet Details</h2>
            <div className='info-grid'>
              <div className='info-item'>
                <span className='label'>Type</span>
                <span className='value'>{pet.type}</span>
              </div>
              {pet.breed && (
                <div className='info-item'>
                  <span className='label'>Breed</span>
                  <span className='value'>{pet.breed}</span>
                </div>
              )}
              <div className='info-item'>
                <span className='label'>Age</span>
                <span className='value'>{formatAge(pet.age)}</span>
              </div>
              <div className='info-item'>
                <span className='label'>Size</span>
                <span className='value'>{formatSize(pet.size)}</span>
              </div>
              <div className='info-item'>
                <span className='label'>Gender</span>
                <span className='value'>{pet.gender}</span>
              </div>
              {pet.location && (
                <div className='info-item'>
                  <span className='label'>Location</span>
                  <span className='value'>{pet.location}</span>
                </div>
              )}
            </div>
          </InfoCard>

          <ActionCard>
            <h3>Interested in {pet.name}?</h3>
            {pet.rescue && (
              <div className='rescue-info'>
                <div className='rescue-name'>{pet.rescue.name}</div>
                {pet.rescue.location && (
                  <div className='rescue-location'>{pet.rescue.location}</div>
                )}
              </div>
            )}
            <div className='actions'>
              {pet.status === 'available' && (
                <ActionLink to={`/apply/${pet.petId}`} className='primary large'>
                  Apply to Adopt
                </ActionLink>
              )}
              {pet.rescue && (
                <ActionLink to={`/rescues/${pet.rescue.rescueId}`} className='outline'>
                  View Rescue Profile
                </ActionLink>
              )}
            </div>
          </ActionCard>
        </Sidebar>

        {pet.description && (
          <DescriptionCard>
            <h2>About {pet.name}</h2>
            <p>{pet.description}</p>
          </DescriptionCard>
        )}
      </MainContent>
    </PageContainer>
  );
};
