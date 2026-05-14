import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { PlanFeature, PlanLimits, RescuePlan } from '@adopt-dont-shop/lib.types';

// Control the usePlan return value without TDZ issues.
const planState = vi.hoisted(() => ({
  current: {
    plan: 'free' as RescuePlan,
    planLimits: {
      maxStaffSeats: 5,
      maxActivePets: 25,
      analyticsHistoryDays: null,
      maxCustomQuestions: 0,
      features: [] as ReadonlyArray<PlanFeature>,
    } as PlanLimits,
    hasFeature: (_: PlanFeature) => false,
    isLoading: false,
    error: null,
  },
}));

vi.mock('../../hooks/usePlan', () => ({
  usePlan: () => planState.current,
}));

import { PlanGate } from './PlanGate';

describe('PlanGate', () => {
  describe('with minPlan prop', () => {
    it('renders children when current plan meets the minimum', () => {
      planState.current = { ...planState.current, plan: 'growth', isLoading: false };

      render(
        <PlanGate minPlan="growth">
          <div>Premium Content</div>
        </PlanGate>
      );

      expect(screen.getByText('Premium Content')).toBeInTheDocument();
    });

    it('renders children when current plan exceeds the minimum', () => {
      planState.current = { ...planState.current, plan: 'professional', isLoading: false };

      render(
        <PlanGate minPlan="growth">
          <div>Premium Content</div>
        </PlanGate>
      );

      expect(screen.getByText('Premium Content')).toBeInTheDocument();
    });

    it('renders upgrade notice when current plan is below minimum', () => {
      planState.current = { ...planState.current, plan: 'free', isLoading: false };

      render(
        <PlanGate minPlan="growth">
          <div>Premium Content</div>
        </PlanGate>
      );

      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders custom fallback when plan is insufficient', () => {
      planState.current = { ...planState.current, plan: 'free', isLoading: false };

      render(
        <PlanGate minPlan="growth" fallback={<div>Custom Upgrade Prompt</div>}>
          <div>Premium Content</div>
        </PlanGate>
      );

      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
      expect(screen.getByText('Custom Upgrade Prompt')).toBeInTheDocument();
    });
  });

  describe('with feature prop', () => {
    it('renders children when plan includes the feature', () => {
      planState.current = {
        ...planState.current,
        plan: 'professional',
        hasFeature: (f: PlanFeature) => f === 'custom_questions',
        isLoading: false,
      };

      render(
        <PlanGate feature="custom_questions">
          <div>Custom Questions Form</div>
        </PlanGate>
      );

      expect(screen.getByText('Custom Questions Form')).toBeInTheDocument();
    });

    it('renders upgrade notice when plan does not include the feature', () => {
      planState.current = {
        ...planState.current,
        plan: 'growth',
        hasFeature: (_: PlanFeature) => false,
        isLoading: false,
      };

      render(
        <PlanGate feature="custom_questions">
          <div>Custom Questions Form</div>
        </PlanGate>
      );

      expect(screen.queryByText('Custom Questions Form')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('while loading', () => {
    it('renders nothing while plan is loading', () => {
      planState.current = { ...planState.current, isLoading: true };

      const { container } = render(
        <PlanGate minPlan="growth">
          <div>Content</div>
        </PlanGate>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });
});
