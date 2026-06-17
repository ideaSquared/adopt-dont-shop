import { describe, it, expect } from 'vitest';
import {
  PETS_VIEW,
  PETS_CREATE,
  APPLICATIONS_APPROVE,
  MODERATION_REPORTS_VIEW,
  ADMIN_SYSTEM_SETTINGS,
  RescuePermissions,
  RescuePermissionGroups,
} from './rescue-permissions';

describe('rescue permission constants', () => {
  it('use the resource.action permission string format', () => {
    expect(PETS_VIEW).toBe('pets.read');
    expect(PETS_CREATE).toBe('pets.create');
    expect(APPLICATIONS_APPROVE).toBe('applications.approve');
    expect(MODERATION_REPORTS_VIEW).toBe('moderation.reports.view');
    expect(ADMIN_SYSTEM_SETTINGS).toBe('admin.system_settings');
  });
});

describe('RescuePermissions group', () => {
  it('collects the individual permission constants', () => {
    expect(RescuePermissions.PETS_VIEW).toBe(PETS_VIEW);
    expect(RescuePermissions.ADMIN_SYSTEM_SETTINGS).toBe(ADMIN_SYSTEM_SETTINGS);
  });

  it('every value is a non-empty permission string', () => {
    const values = Object.values(RescuePermissions);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(typeof value).toBe('string');
      expect(value).toContain('.');
    }
  });
});

describe('RescuePermissionGroups', () => {
  it('grants RESCUE_ADMIN the full set of rescue permissions', () => {
    expect(RescuePermissionGroups.RESCUE_ADMIN).toEqual(Object.values(RescuePermissions));
  });

  it('orders capability by role: admin >= manager >= staff >= volunteer', () => {
    const admin = RescuePermissionGroups.RESCUE_ADMIN.length;
    const manager = RescuePermissionGroups.RESCUE_MANAGER.length;
    const staff = RescuePermissionGroups.RESCUE_STAFF.length;
    const volunteer = RescuePermissionGroups.VOLUNTEER.length;
    expect(admin).toBeGreaterThan(manager);
    expect(manager).toBeGreaterThan(staff);
    expect(staff).toBeGreaterThan(volunteer);
  });

  it('gives the volunteer role only read-style permissions', () => {
    expect(RescuePermissionGroups.VOLUNTEER).toEqual([
      'pets.read',
      'admin.reports',
      'notifications.read',
    ]);
  });

  it('keeps every group as a subset of the admin group', () => {
    const all = new Set<string>(RescuePermissionGroups.RESCUE_ADMIN);
    for (const group of [
      RescuePermissionGroups.RESCUE_MANAGER,
      RescuePermissionGroups.RESCUE_STAFF,
      RescuePermissionGroups.VOLUNTEER,
    ]) {
      for (const permission of group) {
        expect(all.has(permission)).toBe(true);
      }
    }
  });
});
