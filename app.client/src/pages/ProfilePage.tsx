import { useAuth } from '@/contexts/AuthContext';
import { applicationService } from '@/services/applicationService';
import { Application } from '@/types';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
  }

  @media (max-width: 768px) {
    margin-bottom: 2rem;

    h1 {
      font-size: 2rem;
    }
  }
`;

const TabContainer = styled.div`
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 2rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 1rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: ${props => (props.$active ? props.theme.colors.primary[600] : props.theme.text.secondary)};
  border-bottom: 2px solid
    ${props => (props.$active ? props.theme.colors.primary[600] : 'transparent')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary[600]};
  }
`;

const Section = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin-bottom: 1rem;
`;

const ProfileInfo = styled.div`
  display: grid;
  gap: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
`;

const InfoValue = styled.span`
  color: ${props => props.theme.text.primary};
`;

const ApplicationsGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const ApplicationCard = styled.div`
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ApplicationInfo = styled.div`
  h3 {
    font-size: 1.1rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 0.5rem;
  }

  p {
    color: ${props => props.theme.text.secondary};
    font-size: 0.875rem;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;

  ${props => {
    switch (props.$status) {
      case 'submitted':
        return `
          background: ${props.theme.colors.secondary[100]};
          color: ${props.theme.colors.secondary[700]};
        `;
      case 'under_review':
        return `
          background: ${props.theme.colors.primary[100]};
          color: ${props.theme.colors.primary[700]};
        `;
      case 'approved':
        return `
          background: ${props.theme.colors.semantic.success[100]};
          color: ${props.theme.colors.semantic.success[700]};
        `;
      case 'rejected':
        return `
          background: ${props.theme.colors.semantic.error[100]};
          color: ${props.theme.colors.semantic.error[700]};
        `;
      default:
        return `
          background: ${props.theme.colors.neutral[100]};
          color: ${props.theme.colors.neutral[700]};
        `;
    }
  }}
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

type TabType = 'profile' | 'applications' | 'settings';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [isAuthenticated, navigate, activeTab]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userApplications = await applicationService.getUserApplications();
      setApplications(userApplications);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfileTab = () => (
    <Section>
      <SectionTitle>Profile Information</SectionTitle>
      {user && (
        <ProfileInfo>
          <InfoItem>
            <InfoLabel>Name</InfoLabel>
            <InfoValue>
              {user.firstName} {user.lastName}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Email</InfoLabel>
            <InfoValue>{user.email}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Phone</InfoLabel>
            <InfoValue>{user.phone || 'Not provided'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Location</InfoLabel>
            <InfoValue>
              {user.location?.city && user.location?.state
                ? `${user.location.city}, ${user.location.state}`
                : 'Not provided'}
            </InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Member Since</InfoLabel>
            <InfoValue>{formatDate(user.createdAt)}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Email Verified</InfoLabel>
            <InfoValue>{user.emailVerified ? 'Yes' : 'No'}</InfoValue>
          </InfoItem>
        </ProfileInfo>
      )}
      <div style={{ marginTop: '2rem' }}>
        <Button
          onClick={() => {
            // TODO: Implement edit profile functionality
          }}
        >
          Edit Profile
        </Button>
      </div>
    </Section>
  );

  const renderApplicationsTab = () => (
    <Section>
      <SectionTitle>My Applications</SectionTitle>
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant='error'>{error}</Alert>
        </div>
      )}
      {isLoading ? (
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>You haven&apos;t submitted any adoption applications yet.</p>
          <Button onClick={() => navigate('/search')} style={{ marginTop: '1rem' }}>
            Browse Pets
          </Button>
        </div>
      ) : (
        <ApplicationsGrid>
          {applications.map(application => (
            <ApplicationCard key={application.id}>
              <ApplicationInfo>
                <h3>Application #{application.id.slice(-6)}</h3>
                <p>Submitted {formatDate(application.createdAt)}</p>
                {application.petId && <p>Pet ID: {application.petId}</p>}
              </ApplicationInfo>
              <div>
                <StatusBadge $status={application.status}>
                  {application.status.replace('_', ' ')}
                </StatusBadge>
                <div style={{ marginTop: '0.5rem' }}>
                  <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => navigate(`/applications/${application.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </ApplicationCard>
          ))}
        </ApplicationsGrid>
      )}
    </Section>
  );

  const renderSettingsTab = () => (
    <Section>
      <SectionTitle>Settings</SectionTitle>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Settings functionality will be implemented in a future update.</p>
        <p>This will include notification preferences, privacy settings, and account management.</p>
      </div>
    </Section>
  );

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <Container>
      <Header>
        <h1>My Profile</h1>
        <p>Manage your account, applications, and preferences</p>
      </Header>

      <TabContainer>
        <TabList>
          <Tab $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            Profile
          </Tab>
          <Tab $active={activeTab === 'applications'} onClick={() => setActiveTab('applications')}>
            Applications
          </Tab>
          <Tab $active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
            Settings
          </Tab>
        </TabList>
      </TabContainer>

      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'applications' && renderApplicationsTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </Container>
  );
};

export default ProfilePage;
