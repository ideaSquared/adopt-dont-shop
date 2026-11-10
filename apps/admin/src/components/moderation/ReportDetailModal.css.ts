import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const subtitle = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const section = style({
  marginBottom: vars.spacing['4'],
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const sectionTitle = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 0.75rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const infoGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['3'],
  '@media': {
    '(max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const infoItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const infoLabel = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
});

export const infoValue = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  fontWeight: vars.typography.weight.medium,
});

export const description = style({
  fontSize: vars.typography.size.sm,
  color: '#374151',
  lineHeight: 1.6,
  background: '#f9fafb',
  padding: vars.spacing['3'],
  borderRadius: vars.border.radius.base,
  whiteSpace: 'pre-wrap',
});

export const entityCard = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
});

export const entityType = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: vars.spacing['2'],
});

export const entityName = style({
  fontSize: vars.typography.size.base,
  color: '#111827',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['1'],
});

export const entityDetail = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
});

export const divider = style({
  height: '1px',
  background: '#e5e7eb',
  margin: `${vars.spacing['4']} 0`,
});

export const entityId = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  fontFamily: 'monospace',
  marginTop: vars.spacing['2'],
  padding: vars.spacing['2'],
  background: '#f9fafb',
  borderRadius: vars.border.radius.sm,
  border: '1px solid #e5e7eb',
});

export const monospaceId = style({
  fontFamily: 'monospace',
  fontSize: vars.typography.size.xs,
});

export const historyList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const historyItem = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: '0.75rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const historyItemHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const historyItemTitle = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});

export const historyItemMeta = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
});

export const historyEmpty = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  fontStyle: 'italic',
});

export const sanctionList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const sanctionItem = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: vars.border.radius.base,
  padding: '0.75rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const sanctionItemHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const sanctionItemType = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#92400e',
});

export const sanctionItemReason = style({
  fontSize: vars.typography.size.xs,
  color: '#374151',
});

// ── EntityInspector header slot ─────────────────────────────────

export const headerInfo = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const headerBadges = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  flexShrink: 0,
});

export const breadcrumbWrap = style({
  padding: '0.75rem 1.25rem 0',
});

// ── Activity tab ────────────────────────────────────────────────

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
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#3b82f6',
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

export const actionRow = style({
  marginTop: '0.75rem',
});
