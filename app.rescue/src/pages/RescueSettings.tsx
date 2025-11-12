import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { usePermissions } from '../contexts/PermissionsContext';
import { apiService, rescueService } from '../services/libraryServices';
import { RESCUE_SETTINGS_UPDATE } from '@adopt-dont-shop/lib-permissions';
import RescueProfileForm from '../components/rescue/RescueProfileForm';
import AdoptionPolicyForm from '../components/rescue/AdoptionPolicyForm';
import type { RescueProfile, AdoptionPolicy } from '../types/rescue';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1.1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const TabContainer = styled.div`
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const TabList = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: ${props => (props.$active ? '#3b82f6' : '#6b7280')};
  border-bottom-color: ${props => (props.$active ? '#3b82f6' : 'transparent')};
  transition: all 0.2s;
  position: relative;
  bottom: -2px;

  &:hover {
    color: #3b82f6;
  }
`;

const TabPanel = styled.div<{ $active: boolean }>`
  display: ${props => (props.$active ? 'block' : 'none')};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 1.125rem;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  background-color: #fee2e2;
  color: #991b1b;
  padding: 2rem;
  border-radius: 0.5rem;
  text-align: center;

  h3 {
    font-size: 1.25rem;
    margin: 0 0 1rem 0;
  }

  p {
    margin: 0;
  }
`;

const PlaceholderSection = styled.div`
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  padding: 3rem;
  text-align: center;

  h2 {
    font-size: 1.5rem;
    color: #374151;
    margin: 0 0 1rem 0;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

type TabType = 'profile' | 'policies' | 'questions' | 'preferences';

const RescueSettings: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
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

      const staffData = await apiService.get<any>('http://localhost:5000/api/v1/staff/me');
      const rescueId = staffData.data.rescueId;

      if (!rescueId) {
        throw new Error('No rescue ID found for current user');
      }

      const rescueData = await apiService.get<any>(
        `http://localhost:5000/api/v1/rescues/${rescueId}`
      );

      // Extract adoption policies from settings if they exist
      const rescueProfile = { ...rescueData.data };

      // Debug: Log the raw data
      console.log('Raw rescue data:', rescueProfile);
      console.log('Settings:', rescueProfile.settings);

      if (rescueProfile.settings?.adoptionPolicies) {
        rescueProfile.adoptionPolicies = rescueProfile.settings.adoptionPolicies;
        console.log('Extracted adoption policies:', rescueProfile.adoptionPolicies);
      } else {
        console.log('No adoption policies found in settings');
        rescueProfile.adoptionPolicies = null;
      }

      setRescue(rescueProfile);
    } catch (err) {
      console.error('Error loading rescue data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load rescue settings. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: Partial<RescueProfile>) => {
    if (!rescue) return;

    await apiService.put(`http://localhost:5000/api/v1/rescues/${rescue.rescueId}`, profileData);

    await loadRescueData();
  };

  const handleSavePolicies = async (policies: AdoptionPolicy) => {
    if (!rescue) return;

    await rescueService.updateAdoptionPolicies(rescue.rescueId, policies);

    await loadRescueData();
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>Loading rescue settings...</LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader>
          <h1>Rescue Settings</h1>
          <p>Configure your rescue profile, adoption policies, and application questions.</p>
        </PageHeader>
        <ErrorContainer>
          <h3>Unable to Load Settings</h3>
          <p>{error}</p>
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (!canEdit) {
    return (
      <PageContainer>
        <PageHeader>
          <h1>Rescue Settings</h1>
          <p>Configure your rescue profile, adoption policies, and application questions.</p>
        </PageHeader>
        <ErrorContainer>
          <h3>Access Denied</h3>
          <p>You don't have permission to modify rescue settings.</p>
        </ErrorContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <h1>Rescue Settings</h1>
        <p>Configure your rescue profile, adoption policies, and application questions.</p>
      </PageHeader>

      <TabContainer>
        <TabList>
          <Tab $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            Rescue Profile
          </Tab>
          <Tab $active={activeTab === 'policies'} onClick={() => setActiveTab('policies')}>
            Adoption Policies
          </Tab>
          <Tab $active={activeTab === 'questions'} onClick={() => setActiveTab('questions')}>
            Application Questions
          </Tab>
          <Tab $active={activeTab === 'preferences'} onClick={() => setActiveTab('preferences')}>
            Preferences
          </Tab>
        </TabList>
      </TabContainer>

      <TabPanel $active={activeTab === 'profile'}>
        <RescueProfileForm rescue={rescue} onSave={handleSaveProfile} loading={loading} />
      </TabPanel>

      <TabPanel $active={activeTab === 'policies'}>
        <AdoptionPolicyForm
          policy={rescue?.adoptionPolicies || null}
          onSave={handleSavePolicies}
          loading={loading}
        />
      </TabPanel>

      <TabPanel $active={activeTab === 'questions'}>
        <PlaceholderSection>
          <h2>📝 Custom Application Questions</h2>
          <p>
            This feature is coming soon. You'll be able to create custom questions for your adoption
            applications.
          </p>
        </PlaceholderSection>
      </TabPanel>

      <TabPanel $active={activeTab === 'preferences'}>
        <PlaceholderSection>
          <h2>⚙️ System Preferences</h2>
          <p>
            This feature is coming soon. You'll be able to configure notification settings,
            auto-responses, and workflow preferences.
          </p>
        </PlaceholderSection>
      </TabPanel>
    </PageContainer>
  );
};

export default RescueSettings;
