import React, { type ReactNode } from 'react';
import { meetsMinPlan, type PlanFeature, type RescuePlan } from '@adopt-dont-shop/lib.types';
import { usePlan } from '../../hooks/usePlan';

type PlanGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
} & ({ minPlan: RescuePlan; feature?: never } | { feature: PlanFeature; minPlan?: never });

const UpgradeNotice: React.FC = () => (
  <div role="alert" aria-label="Plan upgrade required">
    <p>
      This feature is not available on your current plan. Contact your administrator to upgrade.
    </p>
  </div>
);

export const PlanGate: React.FC<PlanGateProps> = ({ minPlan, feature, children, fallback }) => {
  const { plan, hasFeature, isLoading } = usePlan();

  if (isLoading) return null;

  const allowed = minPlan !== undefined ? meetsMinPlan(plan, minPlan) : hasFeature(feature!);

  if (!allowed) {
    return <>{fallback ?? <UpgradeNotice />}</>;
  }

  return <>{children}</>;
};

export default PlanGate;
