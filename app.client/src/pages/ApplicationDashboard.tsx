import { Button, Card } from '@adopt-dont-shop/lib.components';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { applicationService, petService, Application, Pet } from '@/services';

interface ApplicationWithPet extends Application {
  pet?: Pet;
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${props => props.theme.text.primary};
  margin: 0;
`;

const ApplicationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const ApplicationCard = styled(Card)`
  padding: 1.5rem;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const PetInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const PetDetails = styled.div`
  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    margin: 0;
    color: ${props => props.theme.text.secondary};
    font-size: 0.875rem;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    switch (props.status) {
      case 'submitted':
        return '#3b82f6';
      case 'under_review':
        return '#8b5cf6';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }};
  color: white;
`;

const ApplicationDetails = styled.div`
  margin-top: 1rem;

  p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: ${props => props.theme.text.secondary};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;

  h2 {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 1rem;
  }

  p {
    color: ${props => props.theme.text.secondary};
    margin-bottom: 2rem;
  }
`;

export const ApplicationDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const userApplications = await applicationService.getUserApplications();

      // Load pet details for each application
      const applicationsWithPets = await Promise.all(
        userApplications.map(async app => {
          try {
            const pet = await petService.getPetById(app.petId);
            return { ...app, pet };
          } catch (error) {
            console.error(`Failed to load pet for application ${app.id}:`, error);
            return app;
          }
        })
      );

      setApplications(applicationsWithPets);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationClick = (application: ApplicationWithPet) => {
    // Navigate to application details view
    navigate(`/applications/${application.id}`);
  };

  if (!user) {
    return (
      <Container>
        <EmptyState>
          <h2>Please log in to view your applications</h2>
          <Link to='/login'>
            <Button>Log In</Button>
          </Link>
        </EmptyState>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div>Loading your applications...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <EmptyState>
          <h2>Error loading applications</h2>
          <p>{error}</p>
          <Button onClick={loadApplications}>Try Again</Button>
        </EmptyState>
      </Container>
    );
  }

  if (applications.length === 0) {
    return (
      <Container>
        <Header>
          <Title>My Applications</Title>
        </Header>
        <EmptyState>
          <h2>No applications yet</h2>
          <p>Start your adoption journey by browsing available pets.</p>
          <Link to='/pets'>
            <Button>Browse Pets</Button>
          </Link>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Applications</Title>
      </Header>

      <ApplicationGrid>
        {applications.map(application => (
          <ApplicationCard key={application.id} onClick={() => handleApplicationClick(application)}>
            <PetInfo>
              <PetDetails>
                <h3>{application.pet?.name || 'Pet Name Unavailable'}</h3>
                <p>
                  {application.pet?.breed} • {application.pet?.age_years} years old
                </p>
              </PetDetails>
            </PetInfo>

            <StatusBadge status={application.status}>
              {application.status.replace('_', ' ')}
            </StatusBadge>

            <ApplicationDetails>
              {application.submittedAt && (
                <p>
                  <strong>Submitted:</strong>{' '}
                  {new Date(application.submittedAt).toLocaleDateString()}
                </p>
              )}
              <p>
                <strong>Last Updated:</strong>{' '}
                {new Date(application.updatedAt).toLocaleDateString()}
              </p>
            </ApplicationDetails>

            <ActionButtons>
              <Button
                size='sm'
                variant='outline'
                onClick={e => {
                  e.stopPropagation();
                  handleApplicationClick(application);
                }}
              >
                View Details
              </Button>
            </ActionButtons>
          </ApplicationCard>
        ))}
      </ApplicationGrid>
    </Container>
  );
};
