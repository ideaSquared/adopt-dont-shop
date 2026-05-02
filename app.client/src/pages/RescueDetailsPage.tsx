import { PetCard } from '@/components/PetCard';
import { rescueService, petService, Rescue, Pet } from '@/services';
import { Badge, Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import {
  MdEmail,
  MdInfo,
  MdLanguage,
  MdLocationOn,
  MdPets,
  MdPhone,
  MdVerified,
} from 'react-icons/md';
import { Link, useParams } from 'react-router-dom';
import { AdoptionPoliciesDisplay } from '@/components/rescue/AdoptionPoliciesDisplay';
import * as styles from './RescueDetailsPage.css';

interface RescueDetailsPageProps {}

export const RescueDetailsPage: React.FC<RescueDetailsPageProps> = () => {
  const { id } = useParams<{ id: string }>();
  const [rescue, setRescue] = useState<Rescue | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [petsLoading, setPetsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPets, setTotalPets] = useState(0);
  const [hasMorePets, setHasMorePets] = useState(false);

  useEffect(() => {
    const fetchRescue = async () => {
      if (!id) {
        setError('Rescue ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [rescueData, petsData] = await Promise.all([
          rescueService.getRescue(id),
          petService.getPetsByRescue(id, 1),
        ]);

        setRescue(rescueData);
        setPets(petsData.data);
        setTotalPets(petsData.pagination.total);
        setHasMorePets(petsData.pagination.hasNext);
      } catch (err) {
        console.error('Failed to fetch rescue:', err);
        setError('Failed to load rescue details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRescue();
  }, [id]);

  const loadMorePets = async () => {
    if (!id || !hasMorePets || petsLoading) {
      return;
    }

    try {
      setPetsLoading(true);
      const nextPage = currentPage + 1;
      const petsData = await petService.getPetsByRescue(id, nextPage);

      setPets(prevPets => [...prevPets, ...petsData.data]);
      setCurrentPage(nextPage);
      setHasMorePets(petsData.pagination.hasNext);
    } catch (err) {
      console.error('Failed to load more pets:', err);
    } finally {
      setPetsLoading(false);
    }
  };

  const formatRescueType = (rescue: Rescue) => {
    // Use the type if available, otherwise infer from presence of EIN
    if (rescue.type) {
      return rescue.type === 'individual' ? 'Individual Rescue' : 'Organization';
    }
    return rescue.ein ? 'Organization' : 'Individual Rescue';
  };

  const formatRescueStatus = (status: string) => {
    const statusMap = {
      pending: 'Pending Verification',
      verified: 'Verified',
      suspended: 'Suspended',
      inactive: 'Inactive',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>Loading rescue details...</div>
      </div>
    );
  }

  if (error || !rescue) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <h2>Rescue Not Found</h2>
          <p>{error || 'The rescue you are looking for could not be found.'}</p>
          <Link to='/'>
            <Button variant='primary'>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Button className={styles.backButton} as={Link} to='/' variant='outline' size='sm'>
        ← Back to Search
      </Button>

      <div className={styles.rescueHeader}>
        <h1>{rescue.name}</h1>
        <div className='rescue-meta'>
          <div className='meta-item'>
            <MdLocationOn className='icon' />
            <span>
              {rescue.city}, {rescue.state}
            </span>
          </div>
          <div className='meta-item'>
            <MdPets className='icon' />
            <span>{formatRescueType(rescue)}</span>
          </div>
          {rescue.status && (
            <div className='meta-item'>
              <MdVerified className='icon' />
              <span>{formatRescueStatus(rescue.status)}</span>
            </div>
          )}
        </div>
        <div className='verification-badge'>
          <Badge variant={rescue.status === 'verified' ? 'success' : 'warning'}>
            {rescue.status === 'verified' ? '✓ Verified' : formatRescueStatus(rescue.status)}
          </Badge>
        </div>
        <div className='contact-info'>
          <a href={`mailto:${rescue.contactEmail || rescue.email}`}>
            <Button variant='primary' size='md'>
              Contact Rescue
            </Button>
          </a>
          {rescue.website && (
            <a href={rescue.website} target='_blank' rel='noopener noreferrer'>
              <Button variant='outline' size='md'>
                Visit Website
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className={styles.rescueInfo}>
        <Card className={styles.descriptionCard}>
          <h2>About {rescue.name}</h2>
          {rescue.description ? (
            <p>{rescue.description}</p>
          ) : (
            <p>
              {rescue.name} is a {formatRescueType(rescue).toLowerCase()} based in {rescue.city},{' '}
              {rescue.state}. They are dedicated to helping pets find loving homes.
            </p>
          )}

          {rescue.mission && (
            <>
              <h3>Our Mission</h3>
              <p>{rescue.mission}</p>
            </>
          )}
        </Card>

        <Card className={styles.contactCard}>
          <h2>Contact Information</h2>

          {rescue.contactPerson && (
            <div className='contact-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' />
              </svg>
              <div className='details'>
                <div className='label'>Contact Person</div>
                <div className='value'>
                  {rescue.contactPerson}
                  {rescue.contactTitle && ` - ${rescue.contactTitle}`}
                </div>
              </div>
            </div>
          )}

          <div className='contact-item'>
            <MdEmail className='icon' />
            <div className='details'>
              <div className='label'>Email</div>
              <div className='value'>{rescue.email}</div>
            </div>
          </div>

          {rescue.contactEmail && rescue.contactEmail !== rescue.email && (
            <div className='contact-item'>
              <MdEmail className='icon' />
              <div className='details'>
                <div className='label'>Contact Email</div>
                <div className='value'>{rescue.contactEmail}</div>
              </div>
            </div>
          )}

          {rescue.phone && (
            <div className='contact-item'>
              <MdPhone className='icon' />
              <div className='details'>
                <div className='label'>Phone</div>
                <div className='value'>{rescue.phone}</div>
              </div>
            </div>
          )}

          {rescue.contactPhone && rescue.contactPhone !== rescue.phone && (
            <div className='contact-item'>
              <MdPhone className='icon' />
              <div className='details'>
                <div className='label'>Contact Phone</div>
                <div className='value'>{rescue.contactPhone}</div>
              </div>
            </div>
          )}

          <div className='contact-item'>
            <MdLocationOn className='icon' />
            <div className='details'>
              <div className='label'>Location</div>
              <div className='value'>
                {rescue.address && `${rescue.address}, `}
                {rescue.city}, {rescue.state}
                {rescue.zipCode && ` ${rescue.zipCode}`}
                {rescue.country !== 'US' && `, ${rescue.country}`}
              </div>
            </div>
          </div>

          {rescue.website && (
            <div className='contact-item'>
              <MdLanguage className='icon' />
              <div className='details'>
                <div className='label'>Website</div>
                <div className='value'>
                  <a
                    href={rescue.website}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='website-link'
                  >
                    {rescue.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            </div>
          )}

          {rescue.ein && (
            <div className='contact-item'>
              <MdInfo className='icon' />
              <div className='details'>
                <div className='label'>EIN</div>
                <div className='value'>{rescue.ein}</div>
              </div>
            </div>
          )}

          {rescue.registrationNumber && (
            <div className='contact-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z' />
              </svg>
              <div className='details'>
                <div className='label'>Registration Number</div>
                <div className='value'>{rescue.registrationNumber}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AdoptionPoliciesDisplay
        adoptionPolicies={rescue.adoptionPolicies}
        rescueName={rescue.name}
      />

      <div className={styles.petsSection}>
        <div className='pets-header'>
          <h2>Pets from {rescue.name}</h2>
          <div className='pets-count'>
            {totalPets === 0
              ? 'No pets available'
              : `Showing ${pets.length} of ${totalPets} pet${totalPets !== 1 ? 's' : ''}`}
          </div>
        </div>

        {pets.length > 0 ? (
          <>
            <div className={styles.petsGrid}>
              {pets.map(pet => (
                <PetCard key={pet.pet_id} pet={pet} showFavoriteButton={true} />
              ))}
            </div>

            {hasMorePets && (
              <Button
                className={styles.loadMoreButton}
                onClick={loadMorePets}
                disabled={petsLoading}
                variant='outline'
                size='lg'
              >
                {petsLoading ? 'Loading...' : 'Load More Pets'}
              </Button>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            <MdPets className='icon' />
            <h3>No Pets Available</h3>
            <p>
              {rescue.name} doesn&apos;t have any pets available for adoption at the moment. Please
              check back later or contact them directly for more information.
            </p>
            <a href={`mailto:${rescue.contactEmail || rescue.email}`}>
              <Button variant='primary' size='md'>
                Contact {rescue.name}
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
