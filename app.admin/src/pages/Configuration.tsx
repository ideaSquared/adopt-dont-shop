import React from 'react';
import styled from 'styled-components';
import {
  useFeatureGate,
  useConfigValue,
  KNOWN_GATES,
  KNOWN_CONFIGS,
} from '@adopt-dont-shop/lib-feature-flags';
import { Heading, Text, Button } from '@adopt-dont-shop/components';
import { FiRefreshCw, FiSettings, FiFlag, FiExternalLink, FiInfo } from 'react-icons/fi';
import {
  PageContainer,
  PageHeader,
  HeaderLeft,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../components/ui';

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

const InfoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #1e40af;
  margin-bottom: 1rem;

  svg {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  a {
    color: #2563eb;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const GateItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }
`;

const GateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
`;

const GateName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
`;

const GateDescription = styled.div`
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.4;
`;

const GateKey = styled.div`
  font-family: monospace;
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
`;

const StatusBadge = styled.div<{ $enabled: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => (props.$enabled ? '#d1fae5' : '#f3f4f6')};
  color: ${props => (props.$enabled ? '#065f46' : '#6b7280')};
`;

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const SettingLabel = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
`;

const SettingValue = styled.div`
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 6px;
`;

const StatsigLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

// Gate display metadata
const GATE_METADATA: Record<string, { name: string; description: string }> = {
  [KNOWN_GATES.ENABLE_REAL_TIME_MESSAGING]: {
    name: 'Real-Time Messaging',
    description: 'Enable real-time messaging with Socket.IO',
  },
  [KNOWN_GATES.ENABLE_ADVANCED_SEARCH]: {
    name: 'Advanced Search',
    description: 'Enable advanced pet search filters',
  },
  [KNOWN_GATES.ENABLE_NOTIFICATION_CENTER]: {
    name: 'Notification Center',
    description: 'Enable in-app notification center',
  },
  [KNOWN_GATES.ENABLE_APPLICATION_WORKFLOW]: {
    name: 'Application Workflow',
    description: 'Enable advanced application workflow',
  },
  [KNOWN_GATES.ENABLE_CONTENT_MODERATION]: {
    name: 'Content Moderation',
    description: 'Enable content moderation system',
  },
  [KNOWN_GATES.UI_SHOW_BETA_FEATURES]: {
    name: 'Beta Features UI',
    description: 'Show beta features in UI',
  },
  [KNOWN_GATES.FEATURE_SOCIAL_SHARING]: {
    name: 'Social Sharing',
    description: 'Enable social media sharing',
  },
  [KNOWN_GATES.ENABLE_ANALYTICS_TRACKING]: {
    name: 'Analytics Tracking',
    description: 'Enable analytics and user behavior tracking',
  },
  [KNOWN_GATES.ALLOW_BULK_OPERATIONS]: {
    name: 'Bulk Operations',
    description: 'Allow bulk operations for administrators',
  },
  [KNOWN_GATES.FEATURE_RATING_SYSTEM]: {
    name: 'Rating System',
    description: 'Enable user and rescue rating system',
  },
};

// Component for each gate
const GateDisplay: React.FC<{ gateName: string }> = ({ gateName }) => {
  const { value: isEnabled } = useFeatureGate(gateName);
  const metadata = GATE_METADATA[gateName] || {
    name: gateName,
    description: 'No description available',
  };

  return (
    <GateItem>
      <GateInfo>
        <GateName>{metadata.name}</GateName>
        <GateDescription>{metadata.description}</GateDescription>
        <GateKey>{gateName}</GateKey>
      </GateInfo>
      <StatusBadge $enabled={isEnabled}>{isEnabled ? 'Enabled' : 'Disabled'}</StatusBadge>
    </GateItem>
  );
};

const Configuration: React.FC = () => {
  // Application Settings
  const maxApplicationsPerUser = useConfigValue(
    KNOWN_CONFIGS.APPLICATION_SETTINGS,
    'max_applications_per_user',
    5
  );
  const autoApproveVerifiedRescues = useConfigValue(
    KNOWN_CONFIGS.APPLICATION_SETTINGS,
    'auto_approve_verified_rescues',
    false
  );
  const maintenanceMode = useConfigValue(
    KNOWN_CONFIGS.APPLICATION_SETTINGS,
    'maintenance_mode',
    false
  );
  const newRegistrationsEnabled = useConfigValue(
    KNOWN_CONFIGS.APPLICATION_SETTINGS,
    'new_registrations_enabled',
    true
  );
  const adoptionApprovalWorkflowEnabled = useConfigValue(
    KNOWN_CONFIGS.APPLICATION_SETTINGS,
    'adoption_approval_workflow_enabled',
    true
  );

  // System Settings
  const maxFileUploadSizeMb = useConfigValue(
    KNOWN_CONFIGS.SYSTEM_SETTINGS,
    'max_file_upload_size_mb',
    10
  );
  const sessionTimeoutMinutes = useConfigValue(
    KNOWN_CONFIGS.SYSTEM_SETTINGS,
    'session_timeout_minutes',
    120
  );
  const enableDebugLogging = useConfigValue(
    KNOWN_CONFIGS.SYSTEM_SETTINGS,
    'enable_debug_logging',
    false
  );
  const apiRateLimitPerMinute = useConfigValue(
    KNOWN_CONFIGS.SYSTEM_SETTINGS,
    'api_rate_limit_per_minute',
    100
  );

  // Moderation Settings
  const autoModerateEnabled = useConfigValue(
    KNOWN_CONFIGS.MODERATION_SETTINGS,
    'auto_moderate_enabled',
    true
  );
  const profanityFilterEnabled = useConfigValue(
    KNOWN_CONFIGS.MODERATION_SETTINGS,
    'profanity_filter_enabled',
    true
  );
  const requireManualReviewThreshold = useConfigValue(
    KNOWN_CONFIGS.MODERATION_SETTINGS,
    'require_manual_review_threshold',
    0.7
  );
  const maxWarningsBeforeSuspension = useConfigValue(
    KNOWN_CONFIGS.MODERATION_SETTINGS,
    'max_warnings_before_suspension',
    3
  );

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Heading level='h1'>System Configuration</Heading>
          <Text>View feature gates and settings managed through Statsig</Text>
        </HeaderLeft>
        <HeaderActions>
          <Button variant='outline' size='md' onClick={handleRefresh}>
            <FiRefreshCw style={{ marginRight: '0.5rem' }} />
            Reload
          </Button>
          <Button
            variant='primary'
            size='md'
            onClick={() => window.open('https://console.statsig.com', '_blank')}
          >
            <FiExternalLink style={{ marginRight: '0.5rem' }} />
            Open Statsig Console
          </Button>
        </HeaderActions>
      </PageHeader>

      <InfoBanner>
        <FiInfo size={20} />
        <div>
          This page displays read-only configuration from Statsig. To modify feature gates or
          settings, use the{' '}
          <StatsigLink href='https://console.statsig.com' target='_blank' rel='noopener noreferrer'>
            Statsig Console
            <FiExternalLink size={14} />
          </StatsigLink>
          . Changes will be reflected here after refresh.
        </div>
      </InfoBanner>

      <ConfigGrid>
        {/* Feature Gates Section */}
        <SectionCard>
          <CardHeader>
            <CardTitle>
              <FiFlag style={{ display: 'inline', marginRight: '0.5rem' }} />
              Feature Gates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.values(KNOWN_GATES).map(gateName => (
              <GateDisplay key={gateName} gateName={gateName} />
            ))}
          </CardContent>
        </SectionCard>

        {/* Application Settings Section */}
        <SectionCard>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingItem>
              <SettingLabel>Max Applications Per User</SettingLabel>
              <SettingValue>{maxApplicationsPerUser}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Auto-Approve Verified Rescues</SettingLabel>
              <SettingValue>{autoApproveVerifiedRescues ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Maintenance Mode</SettingLabel>
              <SettingValue>{maintenanceMode ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>New Registrations Enabled</SettingLabel>
              <SettingValue>{newRegistrationsEnabled ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Adoption Approval Workflow Enabled</SettingLabel>
              <SettingValue>{adoptionApprovalWorkflowEnabled ? 'true' : 'false'}</SettingValue>
            </SettingItem>
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
            <SettingItem>
              <SettingLabel>Max File Upload Size (MB)</SettingLabel>
              <SettingValue>{maxFileUploadSizeMb}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Session Timeout (Minutes)</SettingLabel>
              <SettingValue>{sessionTimeoutMinutes}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Enable Debug Logging</SettingLabel>
              <SettingValue>{enableDebugLogging ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>API Rate Limit (Per Minute)</SettingLabel>
              <SettingValue>{apiRateLimitPerMinute}</SettingValue>
            </SettingItem>
          </CardContent>
        </SectionCard>

        {/* Moderation Settings Section */}
        <SectionCard>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              Moderation Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingItem>
              <SettingLabel>Auto-Moderate Enabled</SettingLabel>
              <SettingValue>{autoModerateEnabled ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Profanity Filter Enabled</SettingLabel>
              <SettingValue>{profanityFilterEnabled ? 'true' : 'false'}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Manual Review Threshold</SettingLabel>
              <SettingValue>{requireManualReviewThreshold}</SettingValue>
            </SettingItem>
            <SettingItem>
              <SettingLabel>Max Warnings Before Suspension</SettingLabel>
              <SettingValue>{maxWarningsBeforeSuspension}</SettingValue>
            </SettingItem>
          </CardContent>
        </SectionCard>
      </ConfigGrid>
    </PageContainer>
  );
};

export default Configuration;
