import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import clsx from 'clsx';
import { useAuth, useHasPermission } from '@adopt-dont-shop/lib.auth';
import { toast } from '@adopt-dont-shop/lib.components';
import { SettingsFormSkeleton } from '../components/skeletons';
import { apiService, rescueService } from '../services/libraryServices';
import { RESCUE_SETTINGS_UPDATE } from '@adopt-dont-shop/lib.permissions';
import RescueProfileForm from '../components/rescue/RescueProfileForm';
import AdoptionPolicyForm from '../components/rescue/AdoptionPolicyForm';
import QuestionsBuilder from '../components/rescue/QuestionsBuilder';
import type { RescueProfile, AdoptionPolicy } from '../types/rescue';
import * as styles from './RescueSettings.css';

type TabType = 'profile' | 'policies' | 'questions';

const VALID_TABS: ReadonlySet<string> = new Set<TabType>(['profile', 'policies', 'questions']);

// Personal settings moved to /user-settings; keep old links and bookmarks working.
const USER_SETTINGS_HASHES: ReadonlySet<string> = new Set([
  '#preferences',
  '#security',
  '#appearance',
]);

const parseTabFromHash = (hash: string): TabType => {
  const value = hash.replace('#', '');
  return VALID_TABS.has(value) ? (value as TabType) : 'profile';
};

type RescueView = {
  name: string;
  email: string;
  phone: string | null;
  address: string;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  website: string | null;
  description: string | null;
  status: string;
  settings?: { adoptionPolicies?: AdoptionPolicy };
  created_at: string;
  updated_at: string;
};

// The gateway returns a flat snake_case view; the settings forms want a RescueProfile.
const toRescueProfile = (view: RescueView, rescueId: string): RescueProfile => ({
  rescueId,
  name: view.name,
  rescue_type: 'animal_shelter',
  email: view.email,
  phone: view.phone ?? '',
  address: {
    street: view.address,
    city: view.city,
    county: view.county ?? undefined,
    postcode: view.postcode,
    country: view.country,
  },
  description: view.description ?? undefined,
  website: view.website ?? undefined,
  adoptionPolicies: view.settings?.adoptionPolicies,
  verified: view.status === 'verified',
  createdAt: view.created_at,
  updatedAt: view.updated_at,
});

const fetchRescueProfile = async (): Promise<RescueProfile> => {
  const staffData = await apiService.get<{ data: { rescueId?: string } }>('/api/v1/staff/me');
  const rescueId = staffData.data.rescueId;

  if (!rescueId) {
    throw new Error('No rescue ID found for current user');
  }

  const rescueData = await apiService.get<{ data: RescueView }>(`/api/v1/rescues/${rescueId}`);
  return toRescueProfile(rescueData.data, rescueId);
};

const RescueSettings: React.FC = () => {
  const { user } = useAuth();
  // ADS-757: wait for permissions to load before deciding access. Otherwise
  // the Access Denied screen flashes before the real settings render.
  const { allowed: canEdit, isLoading: permissionsLoading } =
    useHasPermission(RESCUE_SETTINGS_UPDATE);
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

  useEffect(() => {
    let cancelled = false;

    const loadRescueData = async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await fetchRescueProfile();
        if (!cancelled) {
          setRescue(profile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load rescue settings. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRescueData();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const loadRescueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRescue(await fetchRescueProfile());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load rescue settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (USER_SETTINGS_HASHES.has(location.hash)) {
    return <Navigate to={`/user-settings${location.hash}`} replace />;
  }

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

  if (permissionsLoading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1>Rescue Settings</h1>
          <p>Configure your rescue profile, adoption policies, and application questions.</p>
        </div>
        <SettingsFormSkeleton />
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
        <div className={styles.tabList} role="tablist">
          <button
            className={clsx(styles.tab, activeTab === 'profile' && styles.tabActive)}
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          >
            Rescue Profile
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'policies' && styles.tabActive)}
            role="tab"
            aria-selected={activeTab === 'policies'}
            onClick={() => setActiveTab('policies')}
          >
            Adoption Policies
          </button>
          <button
            className={clsx(styles.tab, activeTab === 'questions' && styles.tabActive)}
            role="tab"
            aria-selected={activeTab === 'questions'}
            onClick={() => setActiveTab('questions')}
          >
            Application Questions
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
    </div>
  );
};

export default RescueSettings;
