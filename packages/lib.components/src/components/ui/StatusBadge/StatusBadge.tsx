import {
  getStatusDisplay,
  type StatusBadgeVariant,
  type StatusKind,
} from '@adopt-dont-shop/lib.types';
import React from 'react';

import { Badge, type BadgeProps } from '../Badge';

type StatusBadgeCommonProps = Pick<BadgeProps, 'size' | 'rounded' | 'dot' | 'className'> & {
  'data-testid'?: string;
};

export type StatusBadgeProps = StatusBadgeCommonProps &
  (
    | {
        /** Which domain the status belongs to; selects the shared label and colour maps. */
        kind: StatusKind;
        /** Raw status value; unknown values render as a neutral, humanised badge. */
        status: string;
        /** Replaces the shared label (e.g. a longer form on a details page). */
        label?: string;
        /** Replaces the shared colour. */
        variant?: StatusBadgeVariant;
      }
    | {
        variant: StatusBadgeVariant;
        label: string;
      }
  );

export const StatusBadge: React.FC<StatusBadgeProps> = props => {
  const { size = 'sm', rounded = true, dot, className, 'data-testid': dataTestId } = props;
  const display =
    'kind' in props
      ? getStatusDisplay(props.kind, props.status)
      : { label: props.label, variant: props.variant };

  return (
    <Badge
      variant={props.variant ?? display.variant}
      size={size}
      rounded={rounded}
      dot={dot}
      className={className}
      data-testid={dataTestId}
    >
      {props.label ?? display.label}
    </Badge>
  );
};

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
