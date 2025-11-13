import { ProfileEditForm, SettingsForm } from '@/components/profile';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { applicationService, authService, Application, User } from '@/services';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// Extended interface for applications with pet info
interface ApplicationWithPetInfo extends Application {
  petName?: string;
  petType?: string;
  petBreed?: string;
}

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

interface UserSettings {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'private';
    showEmail?: boolean;
    showPhone?: boolean;
  };
  preferences?: {
    petTypes?: string[];
    maxDistance?: number;
    newsletterOptIn?: boolean;
  };
}

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [applications, setApplications] = useState<ApplicationWithPetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user is an adopter - only adopters have applications
      if (user?.userType !== 'adopter') {
        setApplications([]);
        return;
      }

      const userApplications = await applicationService.getUserApplications();
      setApplications(userApplications as ApplicationWithPetInfo[]);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.userType]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (activeTab === 'applications') {
      loadApplications();
    }
  }, [isAuthenticated, navigate, activeTab, loadApplications]);

  const handleProfileSave = async (updatedData: Partial<User>) => {
    if (!user) {
      return;
    }

    try {
      setIsSavingProfile(true);
      setError(null);

      // Use the updateProfile method from AuthContext which handles both dev and production
      if (updateProfile) {
        await updateProfile(updatedData);
      } else {
        throw new Error('Profile update is not available. Please refresh the page and try again.');
      }

      setIsEditingProfile(false);
      setSuccessMessage('Profile updated successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('validation') || error.message.includes('Validation')) {
          setError('Please check your input and try again.');
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.');
        } else if (
          error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized')
        ) {
          setError('Your session has expired. Please log in again.');
        } else {
          setError(error.message || 'Failed to update profile. Please try again.');
        }
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSettingsSave = async (settings: UserSettings) => {
    try {
      setIsSavingSettings(true);
      setError(null);

      // In dev mode, just store settings in localStorage
      if (import.meta.env.DEV) {
        localStorage.setItem('user_settings', JSON.stringify(settings));
        return;
      }

      // For real users, this would call the API
      // TODO: Implement API call when backend is ready
      // eslint-disable-next-line no-console
      console.log('Settings would be sent to API:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);

      // In dev mode, check if using dev token before calling API
      if (import.meta.env.DEV) {
        const token = localStorage.getItem('accessToken');
        if (token?.startsWith('dev-token-')) {
          // Clear dev mode data
          localStorage.removeItem('dev_user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user_settings');
          navigate('/');
          return;
        }
      }

      // Call the API to delete account
      await authService.deleteAccount('User requested account deletion');

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      setError('Failed to delete account. Please try again.');
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
      {successMessage && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant='success'>{successMessage}</Alert>
        </div>
      )}
      {user && (
        <>
          {isEditingProfile ? (
            <ProfileEditForm
              user={user}
              onSave={handleProfileSave}
              onCancel={() => setIsEditingProfile(false)}
              isLoading={isSavingProfile}
            />
          ) : (
            <>
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
                  <InfoLabel>Preferred Contact</InfoLabel>
                  <InfoValue>{user.preferredContactMethod || 'Not specified'}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>Location</InfoLabel>
                  <InfoValue>
                    {(user.location?.city || user.city) &&
                    (user.location?.state || user.location?.country || user.country)
                      ? `${user.location?.city || user.city}, ${
                          user.location?.state || user.location?.country || user.country
                        }`
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
                {user.bio && (
                  <InfoItem>
                    <InfoLabel>Bio</InfoLabel>
                    <InfoValue>{user.bio}</InfoValue>
                  </InfoItem>
                )}
              </ProfileInfo>
              <div style={{ marginTop: '2rem' }}>
                <Button onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
              </div>
            </>
          )}
        </>
      )}
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
      {user?.userType !== 'adopter' ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Applications are only available for adopter accounts.</p>
          <p>As a {user?.userType}, you don&apos;t submit adoption applications.</p>
        </div>
      ) : isLoading ? (
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
                <p>Submitted {formatDate(application.submittedAt || application.createdAt)}</p>
                {application.petName && (
                  <p>
                    Pet: {application.petName} ({application.petType})
                  </p>
                )}
                {application.petId && !application.petName && <p>Pet ID: {application.petId}</p>}
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
      {user && (
        <SettingsForm
          user={user}
          onSave={handleSettingsSave}
          onDeleteAccount={handleDeleteAccount}
          isLoading={isSavingSettings}
        />
      )}
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
