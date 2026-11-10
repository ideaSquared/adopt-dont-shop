import React, { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth, useHasPermission } from '@adopt-dont-shop/lib.auth';
import { ErrorState, PageHeader, Tabs, toast } from '@adopt-dont-shop/lib.components';
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
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['rescue', 'settings-profile', user?.userId],
    queryFn: fetchRescueProfile,
    staleTime: 0,
  });
  const rescue = profileQuery.data ?? null;
  const loading = profileQuery.isLoading;
  const error = profileQuery.error
    ? profileQuery.error instanceof Error
      ? profileQuery.error.message
      : 'Failed to load rescue settings. Please try again.'
    : null;
  const reloadRescue = () =>
    queryClient.invalidateQueries({ queryKey: ['rescue', 'settings-profile'] });

  // The forms report their own save failures, so opt out of the generic toast.
  const saveProfileMutation = useMutation({
    mutationFn: ({
      rescueId,
      profileData,
    }: {
      rescueId: string;
      profileData: Partial<RescueProfile>;
    }) => apiService.put(`/api/v1/rescues/${rescueId}`, profileData),
    onSuccess: reloadRescue,
    onError: () => undefined,
  });
  const savePoliciesMutation = useMutation({
    mutationFn: ({ rescueId, policies }: { rescueId: string; policies: AdoptionPolicy }) =>
      rescueService.updateAdoptionPolicies(rescueId, policies),
    onSuccess: reloadRescue,
    onError: () => undefined,
  });

  const handleSaveProfile = async (profileData: Partial<RescueProfile>) => {
    if (!rescue) {
      return;
    }

    await saveProfileMutation.mutateAsync({ rescueId: rescue.rescueId, profileData });
    // ADS-125
    toast.success('Rescue details saved');
  };

  const handleSavePolicies = async (policies: AdoptionPolicy) => {
    if (!rescue) {
      return;
    }

    await savePoliciesMutation.mutateAsync({ rescueId: rescue.rescueId, policies });
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
        <PageHeader
          title="Rescue Settings"
          description="Configure your rescue profile, adoption policies, and application questions."
        />
        <ErrorState title="Unable to Load Settings" message={error} />
      </div>
    );
  }

  if (permissionsLoading) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader
          title="Rescue Settings"
          description="Configure your rescue profile, adoption policies, and application questions."
        />
        <SettingsFormSkeleton />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className={styles.pageContainer}>
        <PageHeader
          title="Rescue Settings"
          description="Configure your rescue profile, adoption policies, and application questions."
        />
        <ErrorState
          title="Access Denied"
          message="You don't have permission to modify rescue settings."
        />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <PageHeader
        title="Rescue Settings"
        description="Configure your rescue profile, adoption policies, and application questions."
      />

      <Tabs
        value={activeTab}
        onChange={id => setActiveTab(parseTabFromHash(id))}
        aria-label="Rescue settings sections"
        tabs={[
          {
            id: 'profile',
            label: 'Rescue Profile',
            content: (
              <RescueProfileForm
                rescue={rescue}
                onSave={handleSaveProfile}
                loading={profileQuery.isFetching}
              />
            ),
          },
          {
            id: 'policies',
            label: 'Adoption Policies',
            content: (
              <AdoptionPolicyForm
                policy={rescue?.adoptionPolicies || null}
                onSave={handleSavePolicies}
                loading={profileQuery.isFetching}
              />
            ),
          },
          {
            id: 'questions',
            label: 'Application Questions',
            content: rescue?.rescueId ? (
              <QuestionsBuilder rescueId={rescue.rescueId} />
            ) : (
              <div className={styles.placeholderSection}>
                <h2>Custom Application Questions</h2>
                <p>Loading rescue information...</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default RescueSettings;
