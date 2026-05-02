import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useChat } from '@/contexts/ChatContext';
import { useStatsig } from '@/hooks/useStatsig';
import { petService, Pet } from '@/services';
import { Badge, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoginPromptModal } from '../components/modals/LoginPromptModal';
import { resolveFileUrl } from '../utils/fileUtils';
import * as styles from './PetDetailsPage.css';

interface PetDetailsPageProps {}

export const PetDetailsPage: React.FC<PetDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { startConversation } = useChat();
  const { logEvent } = useStatsig();
  const { trackPageView, trackEvent } = useAnalytics();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPet = async () => {
      if (!id) {
        setError('Pet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const petData = await petService.getPetById(id);
        setPet(petData);

        // Track page view with new analytics service
        trackPageView(`/pets/${id}`);
        trackEvent({
          category: 'pet_details',
          action: 'pet_viewed',
          label: petData.name,
          sessionId: 'pet-details-session',
          timestamp: new Date(),
          properties: {
            pet_id: id,
            pet_name: petData.name,
            pet_type: petData.type,
            pet_breed: petData.breed || 'unknown',
            pet_age_years: petData.age_years || 0,
            pet_status: petData.status,
            pet_gender: petData.gender || 'unknown',
            pet_size: petData.size || 'unknown',
            has_images: !!(petData.images && petData.images.length > 0),
            image_count: petData.images?.length || 0,
            user_authenticated: isAuthenticated,
          },
        });

        // Log pet details view (existing Statsig tracking)
        logEvent('pet_details_viewed', 1, {
          pet_id: id,
          pet_name: petData.name,
          pet_type: petData.type,
          pet_breed: petData.breed || 'unknown',
          pet_age_years: petData.age_years?.toString() || 'unknown',
          pet_status: petData.status,
          pet_gender: petData.gender || 'unknown',
          pet_size: petData.size || 'unknown',
          has_images: petData.images && petData.images.length > 0 ? 'true' : 'false',
          image_count: (petData.images?.length || 0).toString(),
          user_authenticated: isAuthenticated.toString(),
        });

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
  }, [id, isAuthenticated, logEvent, trackPageView, trackEvent]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated || !pet) {
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await petService.removeFromFavorites(pet.pet_id);
        setIsFavorite(false);

        // Log unfavorite event
        logEvent('pet_unfavorited', 1, {
          pet_id: pet.pet_id.toString(),
          pet_name: pet.name || 'unknown',
          pet_type: pet.type || 'unknown',
          pet_breed: pet.breed || 'unknown',
          source_page: 'pet_details',
          user_authenticated: isAuthenticated.toString(),
        });
      } else {
        await petService.addToFavorites(pet.pet_id);
        setIsFavorite(true);

        // Log favorite event
        logEvent('pet_favorited', 1, {
          pet_id: pet.pet_id.toString(),
          pet_name: pet.name || 'unknown',
          pet_type: pet.type || 'unknown',
          pet_breed: pet.breed || 'unknown',
          source_page: 'pet_details',
          user_authenticated: isAuthenticated.toString(),
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);

      // Log favorite error
      logEvent('pet_favorite_error', 1, {
        pet_id: pet.pet_id.toString(),
        action: isFavorite ? 'remove' : 'add',
        error_message: error instanceof Error ? error.message : 'unknown_error',
        user_authenticated: isAuthenticated.toString(),
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleContactRescue = async () => {
    if (!pet?.rescue_id || !isAuthenticated) {
      return;
    }

    // Log contact attempt
    logEvent('rescue_contact_attempted', 1, {
      pet_id: pet.pet_id.toString(),
      pet_name: pet.name || 'unknown',
      pet_type: pet.type || 'unknown',
      rescue_id: pet.rescue_id.toString(),
      source_page: 'pet_details',
      user_authenticated: isAuthenticated.toString(),
    });

    try {
      // Start a conversation with the rescue
      const conversation = await startConversation(pet.rescue_id, pet.pet_id);

      // Log successful contact initiation
      logEvent('rescue_contact_successful', 1, {
        pet_id: pet.pet_id.toString(),
        pet_name: pet.name || 'unknown',
        rescue_id: pet.rescue_id.toString(),
        conversation_id: conversation.id.toString(),
        source_page: 'pet_details',
        user_authenticated: isAuthenticated.toString(),
      });

      // Navigate to the specific conversation
      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);

      // Log contact error
      logEvent('rescue_contact_error', 1, {
        pet_id: pet.pet_id.toString(),
        rescue_id: pet.rescue_id.toString(),
        error_message: error instanceof Error ? error.message : 'unknown_error',
        source_page: 'pet_details',
        user_authenticated: isAuthenticated.toString(),
      });

      // Add user-visible error handling
      alert('Failed to start conversation. Please try again.');
    }
  };

  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);

    // Log image gallery interaction
    if (pet) {
      logEvent('pet_image_selected', 1, {
        pet_id: pet.pet_id.toString(),
        pet_name: pet.name || 'unknown',
        image_index: index.toString(),
        total_images: pet.images?.length.toString() || '0',
        source_page: 'pet_details',
        user_authenticated: isAuthenticated.toString(),
      });
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      e.preventDefault();
      setShowLoginPrompt(true);
      return;
    }

    if (pet) {
      // Track with new analytics service
      trackEvent({
        category: 'adoption',
        action: 'application_started',
        label: 'pet_details_apply_click',
        sessionId: 'pet-details-session',
        timestamp: new Date(),
        properties: {
          pet_id: pet.pet_id,
          pet_name: pet.name || 'unknown',
          pet_type: pet.type || 'unknown',
          pet_breed: pet.breed || 'unknown',
          pet_age_years: pet.age_years || 0,
          pet_status: pet.status || 'unknown',
          source_page: 'pet_details',
          user_authenticated: isAuthenticated,
        },
      });

      // Existing Statsig tracking
      logEvent('adoption_application_started', 1, {
        pet_id: pet.pet_id.toString(),
        pet_name: pet.name || 'unknown',
        pet_type: pet.type || 'unknown',
        pet_breed: pet.breed || 'unknown',
        pet_age_years: pet.age_years?.toString() || 'unknown',
        pet_status: pet.status || 'unknown',
        source_page: 'pet_details',
        user_authenticated: isAuthenticated.toString(),
      });
    }
  };

  const handleCloseLoginPrompt = () => {
    setShowLoginPrompt(false);
  };

  const handleRescueProfileClick = () => {
    if (pet) {
      logEvent('rescue_profile_viewed', 1, {
        pet_id: pet.pet_id.toString(),
        rescue_id: pet.rescue_id?.toString() || 'unknown',
        source_page: 'pet_details',
        user_authenticated: isAuthenticated.toString(),
      });
    }
  };

  const formatAge = (ageYears?: number, ageMonths?: number) => {
    if (!ageYears && !ageMonths) {
      return 'Unknown';
    }
    if (!ageYears && ageMonths) {
      return `${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
    }
    if (ageYears && !ageMonths) {
      return `${ageYears} year${ageYears !== 1 ? 's' : ''}`;
    }
    return `${ageYears} year${ageYears !== 1 ? 's' : ''} ${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
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
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>Loading pet details...</div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <h2>Pet Not Found</h2>
          <p>{error || 'The pet you are looking for could not be found.'}</p>
          <Link className={styles.errorActionLink} to='/'>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const primaryPhoto = pet.images?.[selectedImageIndex] || pet.images?.[0];
  const resolvedPrimaryPhotoUrl = resolveFileUrl(primaryPhoto?.url);

  return (
    <div className={styles.pageContainer}>
      <Link className={styles.backLink} to='/'>
        ← Back to Search
      </Link>

      <div className={styles.petHeader}>
        <div className={styles.petTitle}>
          <h1>{pet.name}</h1>
          <div className='subtitle'>
            <span>{pet.type}</span>
            {pet.breed && <span>• {pet.breed}</span>}
            <span>• {formatAge(pet.age_years, pet.age_months)}</span>
            <span>• {pet.gender}</span>
            <span>• {formatSize(pet.size)}</span>
          </div>
        </div>
        <div className={styles.statusSection}>
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
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.imageSection}>
          <div className='primary-image'>
            {resolvedPrimaryPhotoUrl ? (
              <img
                src={resolvedPrimaryPhotoUrl}
                alt={pet.name}
                onError={e => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                }}
              />
            ) : null}
            <div
              className={styles.placeholderImage}
              style={{ display: resolvedPrimaryPhotoUrl ? 'none' : 'flex' }}
            />
          </div>
          {pet.images && pet.images.length > 1 && (
            <div className='thumbnail-grid'>
              {pet.images.map((image, index) => (
                <div
                  key={image.image_id}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => handleImageSelect(index)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleImageSelect(index);
                    }
                  }}
                  role='button'
                  tabIndex={0}
                  aria-label={`View photo ${index + 1} of ${pet.name}`}
                >
                  {resolveFileUrl(image.url) ? (
                    <>
                      <img
                        src={resolveFileUrl(image.url)!}
                        alt={`${pet.name} ${index + 1}`}
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.setAttribute(
                            'style',
                            'display: flex'
                          );
                        }}
                      />
                      <div className={styles.thumbnailPlaceholder} style={{ display: 'none' }} />
                    </>
                  ) : (
                    <div className={styles.thumbnailPlaceholder} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <Card className={styles.infoCard}>
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
                <span className='value'>{formatAge(pet.age_years, pet.age_months)}</span>
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
                  <span className='value'>
                    {pet.location.coordinates
                      ? `${pet.location.coordinates[1]}, ${pet.location.coordinates[0]}`
                      : 'Not specified'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className={styles.actionCard}>
            <h3>Interested in {pet.name}?</h3>
            {pet.rescue_id && (
              <div className='rescue-info'>
                <div className='rescue-name'>Rescue ID: {pet.rescue_id}</div>
              </div>
            )}
            <div className='actions'>
              {pet.status === 'available' && (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkPrimary} ${styles.actionLinkLarge}`}
                  to={`/apply/${pet.pet_id}`}
                  onClick={handleApplyClick}
                >
                  Apply to Adopt
                </Link>
              )}
              {pet.rescue_id && (
                <Link
                  className={`${styles.actionLink} ${styles.actionLinkOutline}`}
                  to={`/rescues/${pet.rescue_id}`}
                  onClick={handleRescueProfileClick}
                >
                  View Rescue Profile
                </Link>
              )}
              {pet.rescue_id && isAuthenticated && (
                <Button
                  className={styles.contactButton}
                  variant='primary'
                  size='lg'
                  onClick={handleContactRescue}
                >
                  Contact Rescue
                </Button>
              )}
            </div>
          </Card>
        </div>

        {pet.long_description && (
          <Card className={styles.descriptionCard}>
            <h2>About {pet.name}</h2>
            <p>{pet.long_description}</p>
          </Card>
        )}
      </div>

      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={handleCloseLoginPrompt}
        action='apply for adoption'
      />
    </div>
  );
};
