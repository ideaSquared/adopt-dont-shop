import { useAuth } from '@adopt-dont-shop/lib.auth';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { useChat } from '@/contexts/ChatContext';
import { useStatsig } from '@/hooks/useStatsig';
import { petService, Pet } from '@/services';
import { Badge, Button, Card, toast } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { resolveFileUrl } from '../utils/fileUtils';
import * as styles from './PetDetailsPage.css';

interface PetDetailsPageProps {}

// ADS-638: signed-out visitors must see auth-aware CTAs that route to
// `/login?redirect=<returnPath>` so the original action resumes after
// sign-in. The Apply flow redirects straight to `/apply/:petId`;
// Contact returns to the pet details page with `?action=contact`,
// which we auto-trigger once auth completes.
const buildApplyLoginPath = (petId: string): string =>
  `/login?redirect=${encodeURIComponent(`/apply/${petId}`)}`;

const buildContactLoginPath = (petId: string): string =>
  `/login?redirect=${encodeURIComponent(`/pets/${petId}?action=contact`)}`;

type ApplyCtaProps = {
  isAuthenticated: boolean;
  isUnverified: boolean;
  verificationTooltip: string;
  petId: string;
  onApplyClick: () => void;
};

const renderApplyCta = ({
  isAuthenticated,
  isUnverified,
  verificationTooltip,
  petId,
  onApplyClick,
}: ApplyCtaProps): React.ReactNode => {
  if (isUnverified) {
    return (
      <Button
        className={`${styles.actionLink} ${styles.actionLinkPrimary} ${styles.actionLinkLarge}`}
        variant='primary'
        size='lg'
        disabled
        title={verificationTooltip}
      >
        Apply to Adopt
      </Button>
    );
  }
  if (!isAuthenticated) {
    return (
      <Link
        className={`${styles.actionLink} ${styles.actionLinkPrimary} ${styles.actionLinkLarge}`}
        to={buildApplyLoginPath(petId)}
      >
        Sign in to apply
      </Link>
    );
  }
  return (
    <Link
      className={`${styles.actionLink} ${styles.actionLinkPrimary} ${styles.actionLinkLarge}`}
      to={`/apply/${petId}`}
      onClick={onApplyClick}
    >
      Apply to Adopt
    </Link>
  );
};

type ContactCtaProps = {
  isAuthenticated: boolean;
  isUnverified: boolean;
  verificationTooltip: string;
  petId: string;
  onContactClick: () => void;
};

const renderContactCta = ({
  isAuthenticated,
  isUnverified,
  verificationTooltip,
  petId,
  onContactClick,
}: ContactCtaProps): React.ReactNode => {
  if (!isAuthenticated) {
    return (
      <Link
        className={`${styles.actionLink} ${styles.actionLinkPrimary} ${styles.actionLinkLarge}`}
        to={buildContactLoginPath(petId)}
      >
        Sign in to message rescue
      </Link>
    );
  }
  // ADS-639: signed-in users get a secondary outline-variant button so
  // the "Apply to Adopt" CTA above remains the single primary action.
  // The copy reframes contact as a question before applying rather than
  // a parallel adoption pathway.
  return (
    <Button
      className={styles.contactButton}
      variant='outline'
      size='md'
      onClick={onContactClick}
      disabled={isUnverified}
      title={isUnverified ? verificationTooltip : undefined}
    >
      Ask a question before applying
    </Button>
  );
};

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // ADS-638: after a signed-out user clicks "Sign in to message rescue"
  // and completes auth, they land back here with `?action=contact`. We
  // auto-trigger the contact flow once (per page load) so they don't
  // have to click again.
  const pendingContactRef = useRef(false);

  // Use real browser history so the back button returns to wherever the
  // user actually came from (favourites, home, search). Falls back to the
  // home page when there's no history (e.g. user opened a shared link).
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

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
          pet_type: petData.type ?? 'unknown',
          pet_breed: petData.breed || 'unknown',
          pet_age_years: petData.age_years?.toString() || 'unknown',
          pet_status: petData.status ?? 'unknown',
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

      // Surface failure to the user — without this the button silently
      // snaps back and the user assumes the save succeeded.
      toast.error(
        isFavorite
          ? 'Could not remove from favorites. Please try again.'
          : 'Could not save to favorites. Please try again.',
        { action: { label: 'Retry', onClick: handleFavoriteToggle } }
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleContactRescue = async () => {
    if (!pet?.rescue_id) {
      return;
    }
    if (!isAuthenticated) {
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

      // Add user-visible error handling. Chat init failures are usually
      // transient, so offer a Retry action on the toast.
      toast.error('Failed to start conversation. Please try again.', {
        action: {
          label: 'Retry',
          onClick: handleContactRescue,
        },
      });
    }
  };

  // ADS-638: resume the original action when a signed-out user returns
  // from `/login?redirect=…&action=contact`. We strip the param off the
  // URL after firing so refreshing the page doesn't re-trigger the
  // chat creation flow.
  useEffect(() => {
    if (!isAuthenticated || !pet?.rescue_id) {
      return;
    }
    if (searchParams.get('action') !== 'contact') {
      return;
    }
    if (pendingContactRef.current) {
      return;
    }
    pendingContactRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('action');
    setSearchParams(nextParams, { replace: true });
    void handleContactRescue();
    // handleContactRescue is recreated on every render but is stable
    // enough for this one-shot resume — guarded by pendingContactRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, pet?.rescue_id, searchParams]);

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

  const handleApplyClick = () => {
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

  // Pet schema fields are optional because different API responses return
  // different subsets (lib.pets/src/schemas.ts:55-57). Treat absent
  // size / status as "Unknown" rather than crashing the details page.
  const formatSize = (size: string | undefined) => {
    if (!size) {
      return 'Unknown';
    }
    return size.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status: string | undefined) => {
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

  const getStatusLabel = (status: string | undefined) => {
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
        return status ?? 'Unknown';
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
      <button type='button' className={styles.backLink} onClick={handleBackClick}>
        ← Back
      </button>

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
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback instanceof HTMLElement) {
                    fallback.style.display = 'flex';
                  }
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
              {pet.rescue?.location && (
                <div className='info-item'>
                  <span className='label'>Location</span>
                  <span className='value'>{pet.rescue.location}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className={styles.actionCard}>
            <h3>Interested in {pet.name}?</h3>
            {(() => {
              // A13: surface rescue verification state. `status` is missing
              // on legacy API responses and isn't part of the lib.pets
              // PetRescueSchema type yet — read it through a narrowed
              // index access so the call site stays type-safe.
              const rescueStatus = (pet.rescue as { status?: string } | undefined)?.status;
              const isUnverified = !!rescueStatus && rescueStatus !== 'verified';
              const verificationTooltip =
                'This rescue is awaiting verification — please check back soon';
              return (
                <>
                  {pet.rescue_id && pet.rescue?.name && (
                    <div className='rescue-info'>
                      <div className='rescue-name'>
                        From{' '}
                        <Link to={`/rescues/${pet.rescue_id}`} onClick={handleRescueProfileClick}>
                          {pet.rescue.name}
                        </Link>
                        {pet.rescue.location ? ` · ${pet.rescue.location}` : ''}
                      </div>
                      {isUnverified && <Badge variant='warning'>Pending verification</Badge>}
                    </div>
                  )}
                  <div className='actions'>
                    {pet.status === 'available' &&
                      renderApplyCta({
                        isAuthenticated,
                        isUnverified,
                        verificationTooltip,
                        petId: pet.pet_id,
                        onApplyClick: handleApplyClick,
                      })}
                    {pet.rescue_id &&
                      renderContactCta({
                        isAuthenticated,
                        isUnverified,
                        verificationTooltip,
                        petId: pet.pet_id,
                        onContactClick: handleContactRescue,
                      })}
                    {/*
                      ADS-639: tertiary "View Rescue Profile" inline link.
                      Only shown to signed-in users — ADS-638's signed-out
                      block deliberately limits itself to the two sign-in
                      CTAs and is out of scope for the new hierarchy.
                    */}
                    {pet.rescue_id && isAuthenticated && (
                      <Link
                        className={styles.tertiaryLink}
                        to={`/rescues/${pet.rescue_id}`}
                        onClick={handleRescueProfileClick}
                      >
                        View Rescue Profile
                      </Link>
                    )}
                  </div>
                </>
              );
            })()}
          </Card>
        </div>

        {pet.long_description && (
          <Card className={styles.descriptionCard}>
            <h2>About {pet.name}</h2>
            <p>{pet.long_description}</p>
          </Card>
        )}
      </div>
    </div>
  );
};
