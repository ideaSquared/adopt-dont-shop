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
import styled from 'styled-components';
import { AdoptionPoliciesDisplay } from '@/components/rescue/AdoptionPoliciesDisplay';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackButton = styled(Button)`
  margin-bottom: 2rem;
`;

const RescueHeader = styled.div`
  background: ${props => props.theme.background.secondary};
  border-radius: 16px;
  padding: 3rem;
  margin-bottom: 3rem;
  text-align: center;

  h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: ${props => props.theme.text.primary};
  }

  .rescue-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      color: ${props => props.theme.text.secondary};

      .icon {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
    }
  }

  .verification-badge {
    margin-bottom: 1rem;
  }

  .contact-info {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
`;

const RescueInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  margin-bottom: 3rem;

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const DescriptionCard = styled(Card)`
  padding: 2rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: ${props => props.theme.text.primary};
  }

  h3 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 2rem 0 1rem 0;
    color: ${props => props.theme.text.primary};
  }

  p {
    line-height: 1.6;
    color: ${props => props.theme.text.secondary};
    white-space: pre-wrap;
  }
`;

const ContactCard = styled(Card)`
  padding: 2rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: ${props => props.theme.text.primary};
  }

  .contact-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: ${props => props.theme.background.primary};
    border-radius: 8px;

    .icon {
      width: 20px;
      height: 20px;
      fill: ${props => props.theme.text.secondary};
      flex-shrink: 0;
    }

    .details {
      .label {
        font-weight: 500;
        color: ${props => props.theme.text.secondary};
        font-size: 0.9rem;
      }

      .value {
        color: ${props => props.theme.text.primary};
        font-weight: 600;
      }
    }
  }

  .website-link {
    color: ${props => props.theme.text.link};
    text-decoration: none;

    &:hover {
      color: ${props => props.theme.text.linkHover};
      text-decoration: underline;
    }
  }
`;

const PetsSection = styled.div`
  h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 2rem;
    color: ${props => props.theme.text.primary};
    text-align: center;
  }

  .pets-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;

    .pets-count {
      font-size: 1.1rem;
      color: ${props => props.theme.text.secondary};
    }

    .view-toggle {
      display: flex;
      gap: 0.5rem;
    }
  }
`;

const PetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const LoadMoreButton = styled(Button)`
  margin: 2rem auto;
  display: block;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.text.secondary};

  .icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1rem;
    fill: currentColor;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
`;

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
      <PageContainer>
        <LoadingContainer>Loading rescue details...</LoadingContainer>
      </PageContainer>
    );
  }

  if (error || !rescue) {
    return (
      <PageContainer>
        <ErrorContainer>
          <h2>Rescue Not Found</h2>
          <p>{error || 'The rescue you are looking for could not be found.'}</p>
          <Link to='/'>
            <Button variant='primary'>Back to Home</Button>
          </Link>
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <BackButton as={Link} to='/' variant='outline' size='sm'>
        ← Back to Search
      </BackButton>

      <RescueHeader>
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
      </RescueHeader>

      <RescueInfo>
        <DescriptionCard>
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
        </DescriptionCard>

        <ContactCard>
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
        </ContactCard>
      </RescueInfo>

      <AdoptionPoliciesDisplay
        adoptionPolicies={rescue.adoptionPolicies}
        rescueName={rescue.name}
      />

      <PetsSection>
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
            <PetsGrid>
              {pets.map(pet => (
                <PetCard key={pet.pet_id} pet={pet} showFavoriteButton={true} />
              ))}
            </PetsGrid>

            {hasMorePets && (
              <LoadMoreButton
                onClick={loadMorePets}
                disabled={petsLoading}
                variant='outline'
                size='lg'
              >
                {petsLoading ? 'Loading...' : 'Load More Pets'}
              </LoadMoreButton>
            )}
          </>
        ) : (
          <EmptyState>
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
          </EmptyState>
        )}
      </PetsSection>
    </PageContainer>
  );
};
