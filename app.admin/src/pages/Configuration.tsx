import React from 'react';
import {
  useFeatureGate,
  useConfigValue,
  KNOWN_GATES,
  KNOWN_CONFIGS,
} from '@adopt-dont-shop/lib.feature-flags';
import { Heading, Text, Button } from '@adopt-dont-shop/lib.components';
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
import styles from './Configuration.css';

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

const GateDisplay: React.FC<{ gateName: string }> = ({ gateName }) => {
  const { value: isEnabled } = useFeatureGate(gateName);
  const metadata = GATE_METADATA[gateName] || {
    name: gateName,
    description: 'No description available',
  };

  return (
    <div className={styles.gateItem}>
      <div className={styles.gateInfo}>
        <div className={styles.gateName}>{metadata.name}</div>
        <div className={styles.gateDescription}>{metadata.description}</div>
        <div className={styles.gateKey}>{gateName}</div>
      </div>
      <div className={isEnabled ? styles.statusBadgeEnabled : styles.statusBadgeDisabled}>
        {isEnabled ? 'Enabled' : 'Disabled'}
      </div>
    </div>
  );
};

const Configuration: React.FC = () => {
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
        <div className={styles.headerActions}>
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
        </div>
      </PageHeader>

      <div className={styles.infoBanner}>
        <FiInfo size={20} />
        <div>
          This page displays read-only configuration from Statsig. To modify feature gates or
          settings, use the{' '}
          <a
            className={styles.statsigLink}
            href='https://console.statsig.com'
            target='_blank'
            rel='noopener noreferrer'
          >
            Statsig Console
            <FiExternalLink size={14} />
          </a>
          . Changes will be reflected here after refresh.
        </div>
      </div>

      <div className={styles.configGrid}>
        <Card className={styles.sectionCard}>
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
        </Card>

        <Card className={styles.sectionCard}>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Max Applications Per User</div>
              <div className={styles.settingValue}>{maxApplicationsPerUser}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Auto-Approve Verified Rescues</div>
              <div className={styles.settingValue}>
                {autoApproveVerifiedRescues ? 'true' : 'false'}
              </div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Maintenance Mode</div>
              <div className={styles.settingValue}>{maintenanceMode ? 'true' : 'false'}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>New Registrations Enabled</div>
              <div className={styles.settingValue}>
                {newRegistrationsEnabled ? 'true' : 'false'}
              </div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Adoption Approval Workflow Enabled</div>
              <div className={styles.settingValue}>
                {adoptionApprovalWorkflowEnabled ? 'true' : 'false'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.sectionCard}>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Max File Upload Size (MB)</div>
              <div className={styles.settingValue}>{maxFileUploadSizeMb}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Session Timeout (Minutes)</div>
              <div className={styles.settingValue}>{sessionTimeoutMinutes}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Enable Debug Logging</div>
              <div className={styles.settingValue}>{enableDebugLogging ? 'true' : 'false'}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>API Rate Limit (Per Minute)</div>
              <div className={styles.settingValue}>{apiRateLimitPerMinute}</div>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.sectionCard}>
          <CardHeader>
            <CardTitle>
              <FiSettings style={{ display: 'inline', marginRight: '0.5rem' }} />
              Moderation Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Auto-Moderate Enabled</div>
              <div className={styles.settingValue}>{autoModerateEnabled ? 'true' : 'false'}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Profanity Filter Enabled</div>
              <div className={styles.settingValue}>{profanityFilterEnabled ? 'true' : 'false'}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Manual Review Threshold</div>
              <div className={styles.settingValue}>{requireManualReviewThreshold}</div>
            </div>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>Max Warnings Before Suspension</div>
              <div className={styles.settingValue}>{maxWarningsBeforeSuspension}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Configuration;
