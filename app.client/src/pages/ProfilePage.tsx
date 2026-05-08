import { AdopterProfileSummary, ProfileEditForm, SettingsForm } from '@/components/profile';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { applicationService, authService, Application, User } from '@/services';
import { Alert, Button, Spinner } from '@adopt-dont-shop/lib.components';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as styles from './ProfilePage.css';

// Extended interface for applications with pet info
interface ApplicationWithPetInfo extends Application {
  petName?: string;
  petType?: string;
  petBreed?: string;
}

type TabType = 'profile' | 'applications' | 'settings';

interface UserSettings {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    marketing?: boolean;
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
    if (!user) {
      setError('You must be signed in to save settings.');
      return;
    }

    try {
      setIsSavingSettings(true);
      setError(null);
      setSuccessMessage(null);

      if (!updateProfile) {
        throw new Error('Settings update is not available. Please refresh the page and try again.');
      }

      // Map the SettingsForm shape onto the User profile fields persisted by the
      // backend. Notification toggles in the form itself are saved via
      // notificationService.updatePreferences (see SettingsForm); here we
      // persist privacy, marketing-email opt-in and pet/search preferences so
      // they round-trip with the user profile.
      const profilePatch: Partial<User> = {
        privacySettings: {
          ...(user.privacySettings ?? {}),
          ...(settings.privacy?.profileVisibility !== undefined && {
            profileVisibility: settings.privacy.profileVisibility,
          }),
        },
        notificationPreferences: {
          ...(user.notificationPreferences ?? {}),
          ...(settings.notifications?.email !== undefined && {
            emailNotifications: settings.notifications.email,
          }),
          ...(settings.notifications?.push !== undefined && {
            pushNotifications: settings.notifications.push,
          }),
          ...(settings.notifications?.sms !== undefined && {
            smsNotifications: settings.notifications.sms,
          }),
          ...(settings.notifications?.marketing !== undefined && {
            marketingEmails: settings.notifications.marketing,
          }),
        },
        preferences: {
          ...(user.preferences ?? {}),
          ...(settings.preferences?.petTypes !== undefined && {
            petTypes: settings.preferences.petTypes,
          }),
          ...(settings.preferences?.maxDistance !== undefined && {
            maxDistance: settings.preferences.maxDistance,
          }),
          ...(settings.preferences?.newsletterOptIn !== undefined && {
            newsletterOptIn: settings.preferences.newsletterOptIn,
          }),
        },
      };

      await updateProfile(profilePatch);

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);

      if (error instanceof Error) {
        if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
          setError('Your session has expired. Please log in again.');
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(error.message || 'Failed to save settings. Please try again.');
        }
      } else {
        setError('Failed to save settings. Please try again.');
      }

      // Re-throw so SettingsForm can keep the unsaved-changes flag set
      throw error;
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
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile Information</h2>
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
              <div className={styles.profileInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Name</span>
                  <span className={styles.infoValue}>
                    {user.firstName} {user.lastName}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{user.email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Phone</span>
                  <span className={styles.infoValue}>{user.phone || 'Not provided'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Preferred Contact</span>
                  <span className={styles.infoValue}>
                    {user.preferredContactMethod || 'Not specified'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>
                    {(user.location?.city || user.city) &&
                    (user.location?.state || user.location?.country || user.country)
                      ? `${user.location?.city || user.city}, ${
                          user.location?.state || user.location?.country || user.country
                        }`
                      : 'Not provided'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Member Since</span>
                  <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email Verified</span>
                  <span className={styles.infoValue}>{user.emailVerified ? 'Yes' : 'No'}</span>
                </div>
                {user.bio && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Bio</span>
                    <span className={styles.infoValue}>{user.bio}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '2rem' }}>
                <Button onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
              </div>
              {user.userType === 'adopter' && <AdopterProfileSummary />}
            </>
          )}
        </>
      )}
    </div>
  );

  const renderApplicationsTab = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>My Applications</h2>
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
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>You haven&apos;t submitted any adoption applications yet.</p>
          <Button onClick={() => navigate('/search')} style={{ marginTop: '1rem' }}>
            Browse Pets
          </Button>
        </div>
      ) : (
        <div className={styles.applicationsGrid}>
          {applications.map(application => (
            <div key={application.id} className={styles.applicationCard}>
              <div className={styles.applicationInfo}>
                <h3>Application #{application.id.slice(-6)}</h3>
                <p>Submitted {formatDate(application.submittedAt || application.createdAt)}</p>
                {application.petName && (
                  <p>
                    Pet: {application.petName} ({application.petType})
                  </p>
                )}
                {application.petId && !application.petName && <p>Pet ID: {application.petId}</p>}
              </div>
              <div>
                <span
                  className={styles.statusBadge({
                    status: (['submitted', 'approved', 'rejected'].includes(application.status)
                      ? application.status
                      : 'default') as 'submitted' | 'approved' | 'rejected' | 'default',
                  })}
                >
                  {application.status.replace('_', ' ')}
                </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Settings</h2>
      {successMessage && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant='success'>{successMessage}</Alert>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: '1rem' }} role='alert'>
          <Alert variant='error'>{error}</Alert>
        </div>
      )}
      {user && (
        <SettingsForm
          user={user}
          onSave={handleSettingsSave}
          onDeleteAccount={handleDeleteAccount}
          isLoading={isSavingSettings}
        />
      )}
    </div>
  );

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Profile</h1>
        <p>Manage your account, applications, and preferences</p>
      </div>

      <div className={styles.tabContainer}>
        <div className={styles.tabList}>
          <button
            className={styles.tab({ active: activeTab === 'profile' })}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={styles.tab({ active: activeTab === 'applications' })}
            onClick={() => setActiveTab('applications')}
          >
            Applications
          </button>
          <button
            className={styles.tab({ active: activeTab === 'settings' })}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'applications' && renderApplicationsTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </div>
  );
};

export default ProfilePage;
