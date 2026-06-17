import { KNOWN_GATES, KNOWN_CONFIGS } from './index';

describe('KNOWN_GATES', () => {
  it('maps each known gate to its Statsig gate name', () => {
    expect(KNOWN_GATES.ENABLE_REAL_TIME_MESSAGING).toBe('enable_real_time_messaging');
    expect(KNOWN_GATES.ENABLE_ADVANCED_SEARCH).toBe('enable_advanced_search');
    expect(KNOWN_GATES.ENABLE_NOTIFICATION_CENTER).toBe('enable_notification_center');
    expect(KNOWN_GATES.ENABLE_APPLICATION_WORKFLOW).toBe('enable_application_workflow');
    expect(KNOWN_GATES.ENABLE_CONTENT_MODERATION).toBe('enable_content_moderation');
    expect(KNOWN_GATES.UI_SHOW_BETA_FEATURES).toBe('ui_show_beta_features');
    expect(KNOWN_GATES.FEATURE_SOCIAL_SHARING).toBe('feature_social_sharing');
    expect(KNOWN_GATES.ENABLE_ANALYTICS_TRACKING).toBe('enable_analytics_tracking');
    expect(KNOWN_GATES.ALLOW_BULK_OPERATIONS).toBe('allow_bulk_operations');
    expect(KNOWN_GATES.FEATURE_RATING_SYSTEM).toBe('feature_rating_system');
  });

  it('exposes a unique gate name for every entry', () => {
    const names = Object.values(KNOWN_GATES);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('KNOWN_CONFIGS', () => {
  it('maps each known config to its Statsig config name', () => {
    expect(KNOWN_CONFIGS.APPLICATION_SETTINGS).toBe('application_settings');
    expect(KNOWN_CONFIGS.SYSTEM_SETTINGS).toBe('system_settings');
    expect(KNOWN_CONFIGS.MODERATION_SETTINGS).toBe('moderation_settings');
  });
});
