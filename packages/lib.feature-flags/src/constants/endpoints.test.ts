import {
  FEATURE_FLAGS_ENDPOINTS,
  FEATURES,
  FEATURE_BY_KEY,
  CONFIG,
  CONFIG_BY_KEY,
  USER_FEATURES,
  EVALUATE_FEATURE,
  CREATE_FEATURE,
  UPDATE_FEATURE,
  DELETE_FEATURE,
  FEATURE_ANALYTICS,
  FEATURE_USAGE,
  EXPERIMENTS,
  EXPERIMENT_ASSIGNMENT,
  REMOTE_CONFIG,
  UPDATE_REMOTE_CONFIG,
} from './endpoints';

describe('FEATURE_FLAGS_ENDPOINTS', () => {
  it('exposes the static feature flag collection endpoints', () => {
    expect(FEATURES).toBe('/api/v1/features');
    expect(CONFIG).toBe('/api/v1/config');
    expect(CREATE_FEATURE).toBe('/api/v1/admin/features');
    expect(FEATURE_ANALYTICS).toBe('/api/v1/features/analytics');
    expect(EXPERIMENTS).toBe('/api/v1/features/experiments');
    expect(REMOTE_CONFIG).toBe('/api/v1/config/remote');
    expect(UPDATE_REMOTE_CONFIG).toBe('/api/v1/admin/config/remote');
  });

  it('builds key-scoped feature endpoints from the supplied key', () => {
    expect(FEATURE_BY_KEY('chat')).toBe('/api/v1/features/chat');
    expect(EVALUATE_FEATURE('chat')).toBe('/api/v1/features/chat/evaluate');
    expect(UPDATE_FEATURE('chat')).toBe('/api/v1/admin/features/chat');
    expect(DELETE_FEATURE('chat')).toBe('/api/v1/admin/features/chat');
    expect(FEATURE_USAGE('chat')).toBe('/api/v1/features/chat/usage');
  });

  it('builds config endpoints from the supplied key', () => {
    expect(CONFIG_BY_KEY('application_settings')).toBe('/api/v1/config/application_settings');
  });

  it('builds user-scoped and experiment endpoints from their identifiers', () => {
    expect(USER_FEATURES('user-123')).toBe('/api/v1/features/user/user-123');
    expect(EXPERIMENT_ASSIGNMENT('exp-9')).toBe('/api/v1/features/experiments/exp-9/assignment');
  });

  it('encodes the same values when accessed via the aggregate object', () => {
    expect(FEATURE_FLAGS_ENDPOINTS.FEATURES).toBe(FEATURES);
    expect(FEATURE_FLAGS_ENDPOINTS.FEATURE_BY_KEY('x')).toBe(FEATURE_BY_KEY('x'));
    expect(FEATURE_FLAGS_ENDPOINTS.CONFIG_BY_KEY('y')).toBe(CONFIG_BY_KEY('y'));
  });
});
