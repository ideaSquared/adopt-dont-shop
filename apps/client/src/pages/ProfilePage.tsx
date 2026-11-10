import {
  AdopterProfileSummary,
  ProfileCompletionMeter,
  ProfileEditForm,
  SettingsForm,
} from '@/components/profile';
import { AccountSettings } from '@adopt-dont-shop/lib.account';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { apiService, User } from '@/services';
import {
  Alert,
  Button,
  PageHeader,
  StatusBadge,
  Tabs,
  toast,
} from '@adopt-dont-shop/lib.components';
import { ApplicationCardSkeletonList } from '@/components/skeletons';
import { applicationStatusLabel } from '@adopt-dont-shop/lib.types';
import { formatDisplayDate } from '@adopt-dont-shop/lib.utils';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as styles from './ProfilePage.css';
import { useProfileApplications } from './useProfileApplications';

// Shape of GET /api/v1/users/me/export (GDPR Art. 15/20 self-service
// export, ADS-1320). Downloaded verbatim as the archive — see
// services/gateway/src/routes/users-export.ts.
interface UserDataExport {
  user?: unknown;
  privacyPreferences?: unknown;
  exportedAt: string;
}

type TabType = 'profile' | 'applications' | 'settings';

interface UserSettings {
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

const toTabType = (id: string): TabType => {
  if (id === 'applications' || id === 'settings') {
    return id;
  }
  return 'profile';
};

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [settingsSection, setSettingsSection] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // GDPR Art. 15/20 self-service export (ADS-1320).
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Clear the success-message timer on unmount to prevent setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const isAdopter = user?.userType === 'adopter';
  const applicationsQuery = useProfileApplications(
    isAuthenticated && isAdopter && activeTab === 'applications'
  );
  const applications = applicationsQuery.data ?? [];
  const applicationsError = applicationsQuery.isError
    ? 'Failed to load applications. Please try again.'
    : null;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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
      // ADS-125
      toast.success('Profile updated');
      // Clear success message after 3 seconds
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 3000);
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
      // backend: privacy and pet/search preferences round-trip with the user
      // profile. Notification preferences are saved separately by the shared
      // Notifications tab (lib.account).
      const profilePatch: Partial<User> = {
        privacySettings: {
          ...(user.privacySettings ?? {}),
          ...(settings.privacy?.profileVisibility !== undefined && {
            profileVisibility: settings.privacy.profileVisibility,
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
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMessage(null), 3000);
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

  const handleDownloadData = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const bundle = await apiService.get<UserDataExport>('/api/v1/users/me/export');

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adopt-dont-shop-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      setExportError('Failed to download your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDisplayDate(dateString);
  };

  const renderProfileTab = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile Information</h2>
      <div role='status' aria-live='polite' aria-atomic='true'>
        {successMessage && (
          <div className={styles.sectionGap}>
            <Alert variant='success'>{successMessage}</Alert>
          </div>
        )}
      </div>
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
                    {user.preferredContactMethod || 'Not provided'}
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
              <div className={styles.sectionTopGap}>
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
      {(error ?? applicationsError) && (
        <div className={styles.sectionGap}>
          <Alert variant='error'>{error ?? applicationsError}</Alert>
        </div>
      )}
      {!isAdopter ? (
        <div className={styles.centeredEmpty}>
          <p>Applications are only available for adopter accounts.</p>
          <p>As a {user?.userType}, you don&apos;t submit adoption applications.</p>
        </div>
      ) : applicationsQuery.isLoading ? (
        <ApplicationCardSkeletonList count={3} />
      ) : applications.length === 0 ? (
        <div className={styles.centeredEmpty}>
          <p>You haven&apos;t submitted any adoption applications yet.</p>
          <Button onClick={() => navigate('/search')} className={styles.buttonTopGap}>
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
                {application.petId && (
                  <p>
                    Pet:{' '}
                    <Link to={`/pets/${application.petId}`}>
                      {application.petName || 'View pet'}
                    </Link>
                    {application.petType && ` (${application.petType})`}
                  </p>
                )}
              </div>
              <div>
                <StatusBadge
                  kind='application'
                  status={application.status}
                  label={applicationStatusLabel(application.status)}
                />
                <div className={styles.smallTopGap}>
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

  const renderPrivacyTab = () => (
    <>
      <div role='status' aria-live='polite' aria-atomic='true'>
        {successMessage && (
          <div className={styles.sectionGap}>
            <Alert variant='success'>{successMessage}</Alert>
          </div>
        )}
      </div>
      {error && (
        <div className={styles.sectionGap} role='alert'>
          <Alert variant='error'>{error}</Alert>
        </div>
      )}
      {user && (
        <SettingsForm user={user} onSave={handleSettingsSave} isLoading={isSavingSettings} />
      )}
      <div className={styles.sectionGap}>
        <h3>Your data</h3>
        <p>
          Download a copy of the personal data we hold about you (GDPR Art. 15/20). The file is
          saved to your device as JSON.
        </p>
        {exportError && (
          <div className={styles.sectionGap} role='alert'>
            <Alert variant='error'>{exportError}</Alert>
          </div>
        )}
        <Button variant='secondary' onClick={handleDownloadData} isLoading={isExporting}>
          Download my data
        </Button>
      </div>
    </>
  );

  const renderSettingsTab = () => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Settings</h2>
      {/* Name and phone are edited in the Profile tab. */}
      <AccountSettings
        value={settingsSection}
        onChange={setSettingsSection}
        showAccountDetails={false}
        extraSections={[
          {
            id: 'privacy',
            label: 'Privacy & data',
            summary: 'Who can see your profile, and a copy of your data',
            content: renderPrivacyTab(),
          },
        ]}
      />
    </div>
  );

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className={styles.container}>
      <ProfileCompletionMeter />
      <PageHeader
        title='My Profile'
        description='Manage your account, applications, and preferences'
      />

      <Tabs
        aria-label='Profile sections'
        value={activeTab}
        onChange={id => setActiveTab(toTabType(id))}
        tabs={[
          {
            id: 'profile',
            label: 'Profile',
            content: activeTab === 'profile' && renderProfileTab(),
          },
          {
            id: 'applications',
            label: 'Applications',
            content: activeTab === 'applications' && renderApplicationsTab(),
          },
          {
            id: 'settings',
            label: 'Settings',
            content: activeTab === 'settings' && renderSettingsTab(),
          },
        ]}
      />
    </div>
  );
};
