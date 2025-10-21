import React, { useState } from 'react';
import styled from 'styled-components';
import { Heading, Text, Button, Input } from '@adopt-dont-shop/components';
import { FiToggleLeft, FiToggleRight, FiSave, FiRefreshCw, FiSettings, FiFlag } from 'react-icons/fi';
import { PageContainer, PageHeader, HeaderLeft, Card, CardHeader, CardTitle, CardContent } from '../components/ui';
import type { FeatureFlag, SystemSetting } from '../types/admin';

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
`;

const SectionCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FeatureFlagItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }
`;

const FlagInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
`;

const FlagName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
`;

const FlagDescription = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.4;
`;

const FlagMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
`;

const ToggleButton = styled.button<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.$enabled ? '#10b981' : '#d1d5db'};
  border-radius: 8px;
  background: ${props => props.$enabled ? '#d1fae5' : '#ffffff'};
  color: ${props => props.$enabled ? '#065f46' : '#6b7280'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    font-size: 1.25rem;
  }

  &:hover {
    background: ${props => props.$enabled ? '#a7f3d0' : '#f3f4f6'};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const SettingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SettingInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const SettingLabel = styled.label`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
`;

const SettingDescription = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
`;

const SettingInput = styled(Input)`
  max-width: 100%;
`;

const SettingSelect = styled.select`
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #9ca3af;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const CategoryTag = styled.span<{ $category: string }>`
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => {
    switch (props.$category) {
      case 'features': return '#ede9fe';
      case 'security': return '#fee2e2';
      case 'performance': return '#dbeafe';
      case 'email': return '#fef3c7';
      case 'api': return '#fce7f3';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$category) {
      case 'features': return '#6b21a8';
      case 'security': return '#991b1b';
      case 'performance': return '#1e40af';
      case 'email': return '#92400e';
      case 'api': return '#9f1239';
      default: return '#374151';
    }
  }};
`;

const RolloutBar = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
`;

const RolloutLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  min-width: 60px;
`;

const RolloutSlider = styled.input.attrs({ type: 'range' })`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }
`;

const RolloutValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  min-width: 40px;
  text-align: right;
`;

// Mock data
const mockFeatureFlags: FeatureFlag[] = [
  {
    flagId: '1',
    name: 'Advanced Search Filters',
    key: 'advanced_search_filters',
    description: 'Enable advanced filtering options in pet search (breed groups, age ranges, special needs)',
    enabled: true,
    rolloutPercentage: 100,
    targetUserTypes: ['adopter', 'rescue_staff'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z'
  },
  {
    flagId: '2',
    name: 'Video Uploads',
    key: 'video_uploads',
    description: 'Allow rescue organizations to upload short video clips of pets',
    enabled: true,
    rolloutPercentage: 50,
    targetUserTypes: ['rescue_staff'],
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-10-15T10:00:00Z'
  },
  {
    flagId: '3',
    name: 'AI-Powered Matching',
    key: 'ai_matching',
    description: 'Use machine learning to suggest best-match pets based on user preferences',
    enabled: false,
    rolloutPercentage: 0,
    createdAt: '2024-09-01T10:00:00Z',
    updatedAt: '2024-09-01T10:00:00Z'
  },
  {
    flagId: '4',
    name: 'Virtual Meet & Greets',
    key: 'virtual_meetings',
    description: 'Enable video call functionality for initial pet meet-and-greets',
    enabled: true,
    rolloutPercentage: 25,
    targetUserTypes: ['adopter', 'rescue_staff'],
    createdAt: '2024-08-10T10:00:00Z',
    updatedAt: '2024-10-10T10:00:00Z'
  }
];

const mockSettings: SystemSetting[] = [
  {
    settingId: '1',
    category: 'security',
    key: 'session_timeout_minutes',
    value: 120,
    description: 'Automatic logout after inactivity (minutes)',
    dataType: 'number',
    updatedAt: '2024-10-01T10:00:00Z',
    updatedBy: 'admin-1'
  },
  {
    settingId: '2',
    category: 'email',
    key: 'email_notification_enabled',
    value: true,
    description: 'Enable email notifications for users',
    dataType: 'boolean',
    updatedAt: '2024-09-15T10:00:00Z',
    updatedBy: 'admin-1'
  },
  {
    settingId: '3',
    category: 'features',
    key: 'max_photos_per_listing',
    value: 10,
    description: 'Maximum number of photos per pet listing',
    dataType: 'number',
    updatedAt: '2024-08-20T10:00:00Z',
    updatedBy: 'admin-2'
  },
  {
    settingId: '4',
    category: 'api',
    key: 'api_rate_limit_per_minute',
    value: 100,
    description: 'API requests allowed per minute per user',
    dataType: 'number',
    updatedAt: '2024-07-10T10:00:00Z',
    updatedBy: 'admin-1'
  },
  {
    settingId: '5',
    category: 'performance',
    key: 'search_results_per_page',
    value: 24,
    description: 'Number of search results displayed per page',
    dataType: 'number',
    updatedAt: '2024-10-15T10:00:00Z',
    updatedBy: 'admin-2'
  }
];

const Configuration: React.FC = () => {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
  const [settings, setSettings] = useState<SystemSetting[]>(mockSettings);

  const toggleFeatureFlag = (flagId: string) => {
    setFeatureFlags(flags =>
      flags.map(flag =>
        flag.flagId === flagId
          ? { ...flag, enabled: !flag.enabled, updatedAt: new Date().toISOString() }
          : flag
      )
    );
  };

  const updateRollout = (flagId: string, percentage: number) => {
    setFeatureFlags(flags =>
      flags.map(flag =>
        flag.flagId === flagId
          ? { ...flag, rolloutPercentage: percentage, updatedAt: new Date().toISOString() }
          : flag
      )
    );
  };

  const updateSetting = (settingId: string, value: any) => {
    setSettings(currentSettings =>
      currentSettings.map(setting =>
        setting.settingId === settingId
          ? { ...setting, value, updatedAt: new Date().toISOString() }
          : setting
      )
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level="h1">System Configuration</Heading>
          <Text>Manage feature flags and platform settings</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant="outline" size="medium">
            <FiRefreshCw style={{ marginRight: '0.5rem' }} />
            Reload Config
          </Button>
          <Button variant="primary" size="medium">
            <FiSave style={{ marginRight: '0.5rem' }} />
            Save All
          </Button>
        </HeaderActions>
      </PageHeader>

      <ConfigGrid>
        {/* Feature Flags Section */}
        <SectionCard>
          <CardHeader>
            <CardTitle>
              <FiFlag style={{ display: 'inline', marginRight: '0.5rem' }} />
              Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {featureFlags.map((flag) => (
              <FeatureFlagItem key={flag.flagId}>
                <FlagInfo>
                  <FlagName>{flag.name}</FlagName>
                  <FlagDescription>{flag.description}</FlagDescription>
                  <FlagMeta>
                    <span>Key: {flag.key}</span>
                    {flag.targetUserTypes && (
                      <span>• Users: {flag.targetUserTypes.join(', ')}</span>
                    )}
                    <span>• Updated: {formatDate(flag.updatedAt)}</span>
                  </FlagMeta>
                  {flag.enabled && (
                    <RolloutBar>
                      <RolloutLabel>Rollout:</RolloutLabel>
                      <RolloutSlider
                        min="0"
                        max="100"
                        value={flag.rolloutPercentage}
                        onChange={(e) => updateRollout(flag.flagId, parseInt(e.target.value))}
                      />
                      <RolloutValue>{flag.rolloutPercentage}%</RolloutValue>
                    </RolloutBar>
                  )}
                </FlagInfo>
                <ToggleButton
                  $enabled={flag.enabled}
                  onClick={() => toggleFeatureFlag(flag.flagId)}
                >
                  {flag.enabled ? <FiToggleRight /> : <FiToggleLeft />}
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </ToggleButton>
              </FeatureFlagItem>
            ))}
          </CardContent>
        </SectionCard>

        {/* System Settings Section */}
        <SectionCard>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {settings.map((setting) => (
              <SettingItem key={setting.settingId}>
                <SettingHeader>
                  <SettingInfo>
                    <SettingLabel>{setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SettingLabel>
                    <SettingDescription>{setting.description}</SettingDescription>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <CategoryTag $category={setting.category}>{setting.category}</CategoryTag>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Updated: {formatDate(setting.updatedAt)}
                      </span>
                    </div>
                  </SettingInfo>
                </SettingHeader>
                {setting.dataType === 'boolean' ? (
                  <ToggleButton
                    $enabled={setting.value as boolean}
                    onClick={() => updateSetting(setting.settingId, !setting.value)}
                  >
                    {setting.value ? <FiToggleRight /> : <FiToggleLeft />}
                    {setting.value ? 'Enabled' : 'Disabled'}
                  </ToggleButton>
                ) : setting.dataType === 'number' ? (
                  <SettingInput
                    type="number"
                    value={setting.value as number}
                    onChange={(e) => updateSetting(setting.settingId, parseInt(e.target.value))}
                  />
                ) : (
                  <SettingInput
                    type="text"
                    value={setting.value as string}
                    onChange={(e) => updateSetting(setting.settingId, e.target.value)}
                  />
                )}
              </SettingItem>
            ))}
          </CardContent>
        </SectionCard>
      </ConfigGrid>
    </PageContainer>
  );
};

export default Configuration;
