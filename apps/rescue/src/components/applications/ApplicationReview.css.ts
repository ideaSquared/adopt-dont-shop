import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';
import { recipe } from '@vanilla-extract/recipes';

export const loadingContainer = style({
  padding: vars.spacing['4'],
  textAlign: 'center',
});

export const errorMessage = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
  marginBottom: vars.spacing['4'],
});

export const header = style({
  background: '#f9fafb',
  padding: vars.spacing['4'],
  borderBottom: '1px solid #e5e7eb',
});

export const headerContent = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['3'],
  '@media': {
    // On narrow screens the title block and the action cluster no longer fit
    // side by side, so stack them to avoid horizontal overflow inside the modal.
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const headerLeft = style({
  display: 'flex',
  flexDirection: 'column',
});

export const headerSubtitle = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: `${vars.spacing['1']} 0 0 0`,
});

export const headerRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  // Allow the badges and action buttons to wrap onto multiple lines rather
  // than overflowing the modal width on small screens.
  flexWrap: 'wrap',
});

export const stageBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.875rem',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  borderRadius: vars.border.radius.pill,
  color: 'white',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

// Root of the shared Tabs component: the tablist stays pinned while the panels scroll.
export const content = style({});

globalStyle(`${content} [role="tablist"]`, {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  background: vars.background.surface,
  padding: `0 ${vars.spacing['4']}`,
  marginBottom: 0,
  // The four tabs don't fit across a phone-width modal; allow horizontal
  // scrolling so every tab stays reachable instead of overflowing/clipping.
  overflowX: 'auto',
});

globalStyle(`${content} [role="tablist"] > button`, {
  whiteSpace: 'nowrap',
});

globalStyle(`${content} [role="tabpanel"]`, {
  padding: vars.spacing['4'],
});

export const timelineContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  padding: `${vars.spacing['3']} 0`,
});

export const timelineItem = style({
  display: 'flex',
  gap: vars.spacing['3'],
  position: 'relative',
  padding: vars.spacing['3'],
  background: '#fafbfc',
  border: '1px solid #e1e5e9',
  borderRadius: vars.border.radius.base,
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f6f8fa',
    borderColor: '#d0d7de',
  },
  selectors: {
    '&:not(:last-child)::after': {
      content: "''",
      position: 'absolute',
      left: '2rem',
      bottom: '-0.75rem',
      width: '2px',
      height: '0.5rem',
      background: '#d1d5db',
    },
  },
});

export const timelineIcon = recipe({
  base: {
    flexShrink: 0,
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
    fontSize: vars.typography.size.base,
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    color: 'white',
  },
  variants: {
    type: {
      status_change: { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      reference_check: { background: 'linear-gradient(135deg, #10b981, #059669)' },
      home_visit: { background: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      note: { background: 'linear-gradient(135deg, #6b7280, #4b5563)' },
      system: { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
      default: { background: 'linear-gradient(135deg, #d1d5db, #9ca3af)', color: '#6b7280' },
    },
  },
  defaultVariants: {
    type: 'default',
  },
});

export const timelineContent = style({
  flex: 1,
  minWidth: 0,
});

export const timelineHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  marginBottom: '0.75rem',
});

export const timelineTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#1f2937',
  margin: 0,
  flex: 1,
});

export const timelineTimestamp = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  whiteSpace: 'nowrap',
  background: '#f3f4f6',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.sm,
  fontWeight: vars.typography.weight.medium,
});

export const timelineDescription = style({
  fontSize: '0.9375rem',
  color: '#4b5563',
  margin: '0 0 0.75rem 0',
  lineHeight: '1.5',
});

export const timelineUser = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  fontStyle: 'italic',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  background: '#f9fafb',
  borderRadius: vars.border.radius.sm,
  display: 'inline-block',
});

export const timelineData = style({
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  margin: '0.75rem 0',
  fontSize: '0.8125rem',
});

globalStyle(`${timelineData} strong`, {
  color: '#374151',
  display: 'block',
  marginBottom: vars.spacing['2'],
});

globalStyle(`${timelineData} pre`, {
  margin: 0,
  color: '#6b7280',
  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  overflowX: 'auto',
});

export const addEventForm = style({
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const addEventTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#1e293b',
  margin: `0 0 ${vars.spacing['3']} 0`,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  selectors: {
    '&::before': {
      content: "'✏️'",
      fontSize: '1.2em',
    },
  },
});

export const formRow = style({
  display: 'flex',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
  '@media': {
    '(max-width: 640px)': {
      flexDirection: 'column',
      gap: '0.75rem',
    },
  },
});

export const formGroup = style({
  flex: 1,
});

export const formActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: vars.spacing['3'],
});

export const section = style({
  marginBottom: vars.spacing['5'],
});

export const sectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['3'],
});

export const sectionTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: vars.spacing['4'],
});

export const card = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
});

export const cardTitle = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: '0 0 0.75rem 0',
});

export const field = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: vars.spacing['2'],
});

export const fieldLabel = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
});

export const fieldValue = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  textAlign: 'right',
  maxWidth: '60%',
});

export const fieldValueFullWidth = style({
  fontSize: vars.typography.size.sm,
  color: '#111827',
  marginTop: vars.spacing['2'],
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
});

export const fieldVertical = style({
  marginBottom: vars.spacing['3'],
});

export const statusUpdateContainer = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
  margin: `${vars.spacing['3']} 0`,
});

export const formField = style({
  marginBottom: vars.spacing['3'],
});

export const referenceCard = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['3'],
});

export const referenceHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: vars.spacing['3'],
});

export const referenceInfo = style({});

export const referenceName = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: 0,
});

export const referenceContact = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: `${vars.spacing['1']} 0`,
});

export const referenceRelation = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: 0,
});

export const referenceNotes = style({
  fontSize: vars.typography.size.sm,
  color: '#374151',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.75rem',
  marginTop: vars.spacing['3'],
});

export const referenceActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['3'],
});

export const referenceForm = style({
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: vars.spacing['3'],
  marginTop: vars.spacing['3'],
  border: '1px solid #e5e7eb',
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'flex-end',
});

export const scheduleVisitForm = style({
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const scheduleVisitTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#1e293b',
  margin: `0 0 ${vars.spacing['3']} 0`,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  selectors: {
    '&::before': {
      content: "'🏠'",
      fontSize: '1.2em',
    },
  },
});

export const visitCard = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
  marginBottom: vars.spacing['3'],
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const visitHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: vars.spacing['3'],
});

export const visitInfo = style({});

export const visitDate = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: 0,
});

export const visitTime = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: `${vars.spacing['1']} 0`,
});

export const visitStaff = style({
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: 0,
});

export const visitNotes = style({
  fontSize: vars.typography.size.sm,
  color: '#374151',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.75rem',
  margin: `${vars.spacing['3']} 0`,
});

globalStyle(`${visitNotes} strong`, {
  display: 'block',
  marginBottom: vars.spacing['2'],
  color: '#1f2937',
});

export const visitCompletedInfo = style({
  margin: `${vars.spacing['3']} 0`,
});

export const visitActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['3'],
  flexWrap: 'wrap',
});

export const rescheduleForm = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginTop: vars.spacing['3'],
});

export const rescheduleTitle = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#92400e',
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const completeVisitForm = style({
  background: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['3'],
  marginTop: vars.spacing['3'],
});

export const completeVisitTitle = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: '#047857',
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const noStatusOptionsText = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  marginTop: vars.spacing['1'],
});

export const statusChangeBlock = style({
  marginTop: vars.spacing['2'],
});

export const oldStatusText = style({
  color: '#ef4444',
});

export const newStatusText = style({
  color: '#10b981',
});

export const notesText = style({
  color: '#6b7280',
});
