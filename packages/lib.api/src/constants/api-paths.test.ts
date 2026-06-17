import { describe, expect, it } from 'vitest';
import {
  API_BASE_PATH,
  API_PATHS,
  APPLICATION_PATHS,
  CHAT_PATHS,
  FEATURE_PATHS,
  NOTIFICATION_PATHS,
  PET_PATHS,
  RESCUE_PATHS,
  buildApiPath,
} from './api-paths';

describe('API path builders', () => {
  it('builds parameterised pet paths', () => {
    expect(PET_PATHS.BY_ID('123')).toBe('/api/v1/pets/123');
    expect(PET_PATHS.PHOTOS('123')).toBe('/api/v1/pets/123/photos');
    expect(PET_PATHS.FAVORITE('123')).toBe('/api/v1/pets/123/favorite');
  });

  it('builds parameterised rescue paths', () => {
    expect(RESCUE_PATHS.BY_ID('r1')).toBe('/api/v1/rescues/r1');
    expect(RESCUE_PATHS.VERIFY('r1')).toBe('/api/v1/rescues/r1/verify');
    expect(RESCUE_PATHS.STAFF('r1')).toBe('/api/v1/rescues/r1/staff');
  });

  it('builds parameterised application, chat, notification and feature paths', () => {
    expect(APPLICATION_PATHS.BY_ID('a1')).toBe('/api/v1/applications/a1');
    expect(APPLICATION_PATHS.STATUS('a1')).toBe('/api/v1/applications/a1/status');
    expect(CHAT_PATHS.MESSAGES('c1')).toBe('/api/v1/conversations/c1/messages');
    expect(NOTIFICATION_PATHS.MARK_READ('n1')).toBe('/api/v1/notifications/n1/read');
    expect(FEATURE_PATHS.BY_NAME('beta')).toBe('/api/v1/features/beta');
  });
});

describe('buildApiPath', () => {
  it('prefixes a path missing a leading slash', () => {
    expect(buildApiPath('pets')).toBe('/api/v1/pets');
  });

  it('prefixes a path that already has a leading slash', () => {
    expect(buildApiPath('/pets')).toBe('/api/v1/pets');
  });

  it('leaves a path that already includes the base prefix untouched', () => {
    expect(buildApiPath('/api/v1/pets/1')).toBe('/api/v1/pets/1');
  });
});

describe('API_PATHS aggregate', () => {
  it('exposes the base path and the build helper', () => {
    expect(API_PATHS.BASE).toBe(API_BASE_PATH);
    expect(API_PATHS.build('users')).toBe('/api/v1/users');
  });
});
