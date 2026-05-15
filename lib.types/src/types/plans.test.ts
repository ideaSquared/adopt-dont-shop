import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, PLAN_HIERARCHY, meetsMinPlan, planHasFeature } from './plans';

describe('PLAN_HIERARCHY', () => {
  it('has exactly 3 tiers in ascending order', () => {
    expect(PLAN_HIERARCHY).toEqual(['free', 'growth', 'professional']);
  });
});

describe('PLAN_LIMITS', () => {
  it('defines limits for all three tiers', () => {
    expect(Object.keys(PLAN_LIMITS)).toEqual(['free', 'growth', 'professional']);
  });

  it('free tier has expected limits', () => {
    const free = PLAN_LIMITS.free;
    expect(free.maxStaffSeats).toBe(5);
    expect(free.maxActivePets).toBe(25);
    expect(free.analyticsHistoryDays).toBeNull();
    expect(free.maxCustomQuestions).toBe(0);
    expect(free.features).toHaveLength(0);
  });

  it('growth tier has expected limits', () => {
    const growth = PLAN_LIMITS.growth;
    expect(growth.maxStaffSeats).toBe(15);
    expect(growth.maxActivePets).toBe(100);
    expect(growth.analyticsHistoryDays).toBe(90);
    expect(growth.maxCustomQuestions).toBe(5);
    expect(growth.features).toContain('analytics');
    expect(growth.features).toContain('reports');
  });

  it('professional tier has unlimited seats and pets', () => {
    const pro = PLAN_LIMITS.professional;
    expect(pro.maxStaffSeats).toBeNull();
    expect(pro.maxActivePets).toBeNull();
    expect(pro.analyticsHistoryDays).toBe(0);
    expect(pro.maxCustomQuestions).toBeNull();
  });

  it('professional tier includes all features', () => {
    const pro = PLAN_LIMITS.professional;
    expect(pro.features).toContain('analytics');
    expect(pro.features).toContain('analytics_export');
    expect(pro.features).toContain('reports');
    expect(pro.features).toContain('scheduled_reports');
    expect(pro.features).toContain('custom_questions');
    expect(pro.features).toContain('bulk_operations');
  });
});

describe('meetsMinPlan', () => {
  it('free meets free', () => {
    expect(meetsMinPlan('free', 'free')).toBe(true);
  });

  it('free does not meet growth', () => {
    expect(meetsMinPlan('free', 'growth')).toBe(false);
  });

  it('free does not meet professional', () => {
    expect(meetsMinPlan('free', 'professional')).toBe(false);
  });

  it('growth meets growth', () => {
    expect(meetsMinPlan('growth', 'growth')).toBe(true);
  });

  it('growth meets free', () => {
    expect(meetsMinPlan('growth', 'free')).toBe(true);
  });

  it('growth does not meet professional', () => {
    expect(meetsMinPlan('growth', 'professional')).toBe(false);
  });

  it('professional meets professional', () => {
    expect(meetsMinPlan('professional', 'professional')).toBe(true);
  });

  it('professional meets growth', () => {
    expect(meetsMinPlan('professional', 'growth')).toBe(true);
  });

  it('professional meets free', () => {
    expect(meetsMinPlan('professional', 'free')).toBe(true);
  });
});

describe('planHasFeature', () => {
  it('free plan has no features', () => {
    expect(planHasFeature('free', 'analytics')).toBe(false);
    expect(planHasFeature('free', 'reports')).toBe(false);
    expect(planHasFeature('free', 'custom_questions')).toBe(false);
    expect(planHasFeature('free', 'bulk_operations')).toBe(false);
  });

  it('growth plan has analytics', () => {
    expect(planHasFeature('growth', 'analytics')).toBe(true);
  });

  it('growth plan has reports', () => {
    expect(planHasFeature('growth', 'reports')).toBe(true);
  });

  it('growth plan does not have analytics_export', () => {
    expect(planHasFeature('growth', 'analytics_export')).toBe(false);
  });

  it('growth plan does not have custom_questions', () => {
    expect(planHasFeature('growth', 'custom_questions')).toBe(false);
  });

  it('growth plan does not have bulk_operations', () => {
    expect(planHasFeature('growth', 'bulk_operations')).toBe(false);
  });

  it('professional plan has all features', () => {
    expect(planHasFeature('professional', 'analytics')).toBe(true);
    expect(planHasFeature('professional', 'analytics_export')).toBe(true);
    expect(planHasFeature('professional', 'reports')).toBe(true);
    expect(planHasFeature('professional', 'scheduled_reports')).toBe(true);
    expect(planHasFeature('professional', 'custom_questions')).toBe(true);
    expect(planHasFeature('professional', 'bulk_operations')).toBe(true);
  });
});
