import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const detailSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  maxHeight: '70vh',
  overflowY: 'auto',
});

export const ticketTitle = style({
  margin: 0,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});

export const ticketId = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  fontFamily: '"Courier New", monospace',
});

export const badgeRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  alignItems: 'center',
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['4'],
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const detailLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
});

export const detailValue = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  fontWeight: vars.typography.weight.medium,
});

export const emptyValue = style({
  color: '#9ca3af',
  fontStyle: 'italic',
});

export const descriptionSection = style({
  padding: vars.spacing['3'],
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
});

export const descriptionLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  marginBottom: '0.75rem',
});

export const descriptionText = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

export const responsesSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const responsesHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});

export const responseCard = style({
  padding: vars.spacing['3'],
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const responseCardInternal = style({
  background: '#fef3c7',
  borderColor: '#fbbf24',
});

export const responseHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const responseMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const responderInfo = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});

export const responseTime = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
});

export const responseContent = style({
  fontSize: vars.typography.size.sm,
  color: '#374151',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

export const replyForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e5e7eb',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});

export const emptyState = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
  color: '#9ca3af',
  fontStyle: 'italic',
});

export const detailValueSecondary = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
});

export const detailValueMeta = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  marginTop: vars.spacing['1'],
});

export const internalNotesSection = style({
  background: '#fef3c7',
  borderColor: '#fbbf24',
});

export const internalNotesLabel = style({
  color: '#92400e',
});

export const internalBadgeSpacing = style({
  marginLeft: vars.spacing['2'],
});

export const userLink = style({
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 'inherit',
  ':hover': {
    textDecoration: 'underline',
  },
});

// ── Activity tab ──────────────────────────────────────────────────

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: '1px solid #e5e7eb',
  ':last-child': {
    borderBottom: 'none',
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#2563eb',
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: '#111827',
  margin: 0,
});

export const activityMeta = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: `${vars.spacing['5']} ${vars.spacing['3']}`,
  textAlign: 'center',
  color: '#6b7280',
  fontSize: vars.typography.size.sm,
});

// ── EntityInspector embed ─────────────────────────────────────────

export const inspectorEmbed = style({
  // The inspector renders its own card; strip the outer surface
  // shadow/border when nested inside the modal body so we don't
  // double-up borders.
  background: 'transparent',
  boxShadow: 'none',
  border: 'none',
});

export const inspectorHeader = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  minWidth: 0,
});
