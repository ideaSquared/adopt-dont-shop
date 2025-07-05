import { PetCard } from '@/components/PetCard';
import { rescueService } from '@/services/rescueService';
import { Pet, Rescue } from '@/types';
import { Badge, Button, Card } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';

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

  const petsPerPage = 12;

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
          rescueService.getPetsByRescue(id, 1, petsPerPage),
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
    if (!id || !hasMorePets || petsLoading) return;

    try {
      setPetsLoading(true);
      const nextPage = currentPage + 1;
      const petsData = await rescueService.getPetsByRescue(id, nextPage, petsPerPage);

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
            <svg className='icon' viewBox='0 0 24 24'>
              <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
            </svg>
            <span>
              {rescue.city}, {rescue.state}
            </span>
          </div>
          <div className='meta-item'>
            <svg className='icon' viewBox='0 0 24 24'>
              <path d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9V7h9v14z' />
            </svg>
            <span>{formatRescueType(rescue)}</span>
          </div>
          {rescue.status && (
            <div className='meta-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
              </svg>
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
            <svg className='icon' viewBox='0 0 24 24'>
              <path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
            </svg>
            <div className='details'>
              <div className='label'>Email</div>
              <div className='value'>{rescue.email}</div>
            </div>
          </div>

          {rescue.contactEmail && rescue.contactEmail !== rescue.email && (
            <div className='contact-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
              </svg>
              <div className='details'>
                <div className='label'>Contact Email</div>
                <div className='value'>{rescue.contactEmail}</div>
              </div>
            </div>
          )}

          {rescue.phone && (
            <div className='contact-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z' />
              </svg>
              <div className='details'>
                <div className='label'>Phone</div>
                <div className='value'>{rescue.phone}</div>
              </div>
            </div>
          )}

          {rescue.contactPhone && rescue.contactPhone !== rescue.phone && (
            <div className='contact-item'>
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z' />
              </svg>
              <div className='details'>
                <div className='label'>Contact Phone</div>
                <div className='value'>{rescue.contactPhone}</div>
              </div>
            </div>
          )}

          <div className='contact-item'>
            <svg className='icon' viewBox='0 0 24 24'>
              <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
            </svg>
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
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z' />
              </svg>
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
              <svg className='icon' viewBox='0 0 24 24'>
                <path d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z' />
              </svg>
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
            <svg className='icon' viewBox='0 0 24 24'>
              <path d='M4.5 12.5C5.11 12.5 5.59 12.81 5.83 13.26L6.94 15.45C7.4 16.4 8.41 17 9.5 17H14.5C15.59 17 16.6 16.4 17.06 15.45L18.17 13.26C18.41 12.81 18.89 12.5 19.5 12.5C20.33 12.5 21 13.17 21 14S20.33 15.5 19.5 15.5C19.22 15.5 19 15.72 19 16S19.22 16.5 19.5 16.5C20.88 16.5 22 15.38 22 14S20.88 11.5 19.5 11.5C18.62 11.5 17.81 11.9 17.27 12.56L16.94 12.95L15.83 10.76C15.37 9.81 14.36 9.21 13.27 9.21H10.73C9.64 9.21 8.63 9.81 8.17 10.76L7.06 12.95L6.73 12.56C6.19 11.9 5.38 11.5 4.5 11.5C3.12 11.5 2 12.62 2 14S3.12 16.5 4.5 16.5C4.78 16.5 5 16.28 5 16S4.78 15.5 4.5 15.5C3.67 15.5 3 14.83 3 14S3.67 12.5 4.5 12.5Z' />
            </svg>
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
