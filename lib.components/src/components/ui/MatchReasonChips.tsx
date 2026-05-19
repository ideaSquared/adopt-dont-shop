import React from 'react';

import { Badge, BadgeVariant } from './Badge';

export type MatchReasonChipKind =
  | 'pref_match'
  | 'lifestyle'
  | 'distance'
  | 'similar_to_liked'
  | 'fresh';

export type MatchReasonChip = {
  kind: MatchReasonChipKind;
  label: string;
};

export type MatchReasonChipsProps = {
  reasons: MatchReasonChip[];
  max?: number;
  className?: string;
  'data-testid'?: string;
};

const VARIANT_BY_KIND: Record<MatchReasonChipKind, BadgeVariant> = {
  pref_match: 'primary',
  lifestyle: 'success',
  distance: 'info',
  similar_to_liked: 'secondary',
  fresh: 'warning',
};

export const MatchReasonChips: React.FC<MatchReasonChipsProps> = ({
  reasons,
  max = 3,
  className,
  'data-testid': dataTestId,
}) => {
  if (!reasons || reasons.length === 0) return null;
  const visible = reasons.slice(0, max);
  return (
    <div
      className={className}
      data-testid={dataTestId}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}
    >
      {visible.map((r, i) => (
        <Badge key={`${r.kind}-${i}`} variant={VARIANT_BY_KIND[r.kind]} size='sm' rounded>
          {r.label}
        </Badge>
      ))}
    </div>
  );
};

MatchReasonChips.displayName = 'MatchReasonChips';
