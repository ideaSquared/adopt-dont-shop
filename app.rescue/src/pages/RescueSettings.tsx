import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth, TwoFactorSettings } from '@adopt-dont-shop/lib.auth';
import { ThemeToggle, toast } from '@adopt-dont-shop/lib.components';
import { SettingsFormSkeleton } from '../components/skeletons';
import { usePermissions } from '../contexts/PermissionsContext';
import { apiService, rescueService } from '../services/libraryServices';
import { RESCUE_SETTINGS_UPDATE } from '@adopt-dont-shop/lib.permissions';
import RescueProfileForm from '../components/rescue/RescueProfileForm';
import AdoptionPolicyForm from '../components/rescue/AdoptionPolicyForm';
import NotificationPreferencesForm from '../components/rescue/NotificationPreferencesForm';
import QuestionsBuilder from '../components/rescue/QuestionsBuilder';
import type { RescueProfile, AdoptionPolicy } from '../types/rescue';
import * as styles from './RescueSettings.css';

type TabType = 'profile' | 'policies' | 'questions' | 'preferences' | 'security' | 'appearance';

const VALID_TABS: ReadonlySet<string> = new Set<TabType>([
  'profile',
  'policies',
  'questions',
  'preferences',
  'security',
  'appearance',
]);

const parseTabFromHash = (hash: string): TabType => {
  const value = hash.replace('#', '');
  return VALID_TABS.has(value) ? (value as TabType) : 'profile';
};

const RescueSettings: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = parseTabFromHash(location.hash);

  const setActiveTab = useCallback(
    (tab: TabType) => {
      const hash = tab === 'profile' ? '' : `#${tab}`;
      navigate(`${location.pathname}${hash}`, { replace: true });
    },
    [navigate, location.pathname]
  );
  const [rescue, setRescue] = useState<RescueProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasPermission(RESCUE_SETTINGS_UPDATE);

  useEffect(() => {
    loadRescueData();
  }, [user]);

  const loadRescueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const staffData = await apiService.get<any>('/api/v1/staff/me');
      const rescueId = staffData.data.rescueId;

      if (!rescueId) {
        throw new Error('No rescue ID found for current user');
      }

      const rescueData = await apiService.get<any>(`/api/v1/rescues/${rescueId}`);

      // Extract adoption policies from settings if they exist
      const rescueProfile = { ...rescueData.data };

      if (rescueProfile.settings?.adoptionPolicies) {
        rescueProfile.adoptionPolicies = rescueProfile.settings.adoptionPolicies;
      } else {
        rescueProfile.adoptionPolicies = null;
      }

      setRescue(rescueProfile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load rescue settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<RescueProfile>) => {
    if (!rescue) {
      return;
    }

    await apiService.put(`/api/v1/rescues/${rescue.rescueId}`, profileData);

    await loadRescueData();
    // ADS-125
    toast.success('Rescue details saved');
  };

  const handleSavePolicies = async (policies: AdoptionPolicy) => {
    if (!rescue) {
      return;
    }

    await rescueService.updateAdoptionPolicies(rescue.rescueId, policies);

    await loadRescueData();
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <SettingsFormSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1>Rescue Settings</h1>
          <p>Configure your rescue profile, adoption policies, and application questions.</p>
        </div>
        <div className={styles.errorContainer}>
          <h3>Unable to Load Settings</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1>Rescue Settings</h1>
          <p>Configure your rescue profile, adoption policies, and application questions.</p>
        </div>
        <div className={styles.errorContainer}>
          <h3>Access Denied</h3>
          <p>You don't have permission to modify rescue settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1>Rescue Settings</h1>
        <p>Configure your rescue profile, adoption policies, and application questions.</p>
      </div>

      <div className={styles.tabContainer}>
        <div className={styles.tabList}>
          <button
            className={clsx(styles.tab, activeTab === 'profile' && styles.tabActive)}
            onClick={() => setActiveTab('profile')}
          >
            Rescue Profile
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'policies' && styles.tabActive)}
            onClick={() => setActiveTab('policies')}
          >
            Adoption Policies
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'questions' && styles.tabActive)}
            onClick={() => setActiveTab('questions')}
          >
            Application Questions
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'preferences' && styles.tabActive)}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'security' && styles.tabActive)}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'appearance' && styles.tabActive)}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>
      </div>

      <div className={clsx(activeTab === 'profile' ? styles.tabPanel : styles.tabPanelHidden)}>
        <RescueProfileForm rescue={rescue} onSave={handleSaveProfile} loading={loading} />
      </div>

      <div className={clsx(activeTab === 'policies' ? styles.tabPanel : styles.tabPanelHidden)}>
        <AdoptionPolicyForm
          policy={rescue?.adoptionPolicies || null}
          onSave={handleSavePolicies}
          loading={loading}
        />
      </div>

      <div className={clsx(activeTab === 'questions' ? styles.tabPanel : styles.tabPanelHidden)}>
        {rescue?.rescueId ? (
          <QuestionsBuilder rescueId={rescue.rescueId} />
        ) : (
          <div className={styles.placeholderSection}>
            <h2>Custom Application Questions</h2>
            <p>Loading rescue information...</p>
          </div>
        )}
      </div>

      <div className={clsx(activeTab === 'preferences' ? styles.tabPanel : styles.tabPanelHidden)}>
        <NotificationPreferencesForm />
      </div>

      <div className={clsx(activeTab === 'security' ? styles.tabPanel : styles.tabPanelHidden)}>
        <div className={styles.securitySection}>
          <h2>Two-Factor Authentication</h2>
          <p>
            Add an extra layer of security to your account by requiring a verification code when you
            sign in.
          </p>
          <TwoFactorSettings />
        </div>
      </div>

      <div className={clsx(activeTab === 'appearance' ? styles.tabPanel : styles.tabPanelHidden)}>
        <div className={styles.securitySection}>
          <h2>Theme</h2>
          <p>Choose how the rescue tools look — light, cosy (warm cream), or dark.</p>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default RescueSettings;
