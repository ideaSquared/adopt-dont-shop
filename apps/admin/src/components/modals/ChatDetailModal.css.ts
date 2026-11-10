import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const modalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  maxHeight: '80vh',
  minHeight: '600px',
});

export const chatTitle = style({
  margin: '0',
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const chatId = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  fontFamily: "'Courier New', monospace",
});

export const messageTimeline = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const messageBubble = recipe({
  base: {
    display: 'flex',
    gap: '0.75rem',
    maxWidth: '70%',
  },
  variants: {
    isOwn: {
      true: { alignSelf: 'flex-end' },
      false: { alignSelf: 'flex-start' },
    },
  },
  defaultVariants: {
    isOwn: false,
  },
});

export const messageContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const messageHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
});

export const messageSender = style({
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
});

export const messageTime = style({
  color: '#9ca3af',
});

export const messageBody = recipe({
  base: {
    padding: '0.75rem 1rem',
    borderRadius: vars.border.radius.lg,
    fontSize: vars.typography.size.sm,
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    position: 'relative',
  },
  variants: {
    deleted: {
      true: {
        background: '#fef2f2',
        color: '#991b1b',
      },
      false: {
        background: '#f3f4f6',
        color: '#111827',
      },
    },
  },
  defaultVariants: {
    deleted: false,
  },
});

export const messageActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignItems: 'center',
});

export const actionButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  background: '#ffffff',
  color: '#6b7280',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f9fafb',
    color: '#ef4444',
    borderColor: '#fecaca',
  },
});

globalStyle(`${actionButton} svg`, {
  fontSize: vars.typography.size.sm,
});

export const participantList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const participantCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  padding: vars.spacing['3'],
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  background: '#ffffff',
});

export const participantAvatar = style({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: '#e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#6b7280',
  flexShrink: '0',
});

export const participantInfo = style({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const participantName = style({
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  fontSize: vars.typography.size.sm,
});

export const participantRole = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['4'],
  '@media': {
    '(max-width: 640px)': {
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

globalStyle(`${detailLabel} svg`, {
  fontSize: vars.typography.size.base,
});

export const detailValue = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  fontWeight: vars.typography.weight.medium,
});

export const actionBar = style({
  display: 'flex',
  gap: '0.75rem',
  paddingTop: vars.spacing['4'],
  borderTop: '1px solid #e5e7eb',
  flexWrap: 'wrap',
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['3'],
  padding: vars.spacing['6'],
  color: '#9ca3af',
  textAlign: 'center',
});

globalStyle(`${emptyState} svg`, {
  fontSize: vars.typography.size['5xl'],
});

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing['6'],
  color: '#9ca3af',
});

export const headerBadgeRow = style({
  display: 'flex',
  gap: vars.spacing['2'],
  flexWrap: 'wrap',
});

export const closeButtonWrapper = style({
  marginLeft: 'auto',
});

export const messagesContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const loadMoreWrapper = style({
  textAlign: 'center',
  padding: vars.spacing['3'],
});

export const moderationHelpText = style({
  marginTop: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
});

export const reportList = style({
  maxHeight: '300px',
  overflowY: 'auto',
});

export const reportCard = style({
  padding: '0.75rem',
  marginBottom: vars.spacing['2'],
  backgroundColor: '#f9fafb',
  borderRadius: '0.375rem',
  border: '1px solid #e5e7eb',
});

export const reportCardHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: vars.spacing['1'],
});

export const reportCategoryLabel = style({
  textTransform: 'capitalize',
});

export const reportDescription = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
});

export const reportMeta = style({
  fontSize: vars.typography.size.xs,
  color: '#9ca3af',
  marginTop: vars.spacing['1'],
});

export const noReportsMessage = style({
  padding: vars.spacing['3'],
  textAlign: 'center',
  color: '#6b7280',
});

export const moderationLink = style({
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
  ':hover': {
    textDecoration: 'underline',
  },
});

export const participantHelpText = style({
  marginBottom: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
});

export const moderationParticipantList = style({
  listStyle: 'none',
  padding: 0,
});

export const participantRow = style({
  padding: vars.spacing['2'],
  marginBottom: vars.spacing['1'],
  backgroundColor: '#f9fafb',
  borderRadius: vars.border.radius.sm,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const participantViewLink = style({
  fontSize: vars.typography.size.sm,
  color: '#2563eb',
});

export const entityLink = style({
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 'inherit',
  ':hover': {
    textDecoration: 'underline',
  },
});
