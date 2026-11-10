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
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const headerContent = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
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
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0.25rem 0 0 0',
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
  fontSize: '0.875rem',
  fontWeight: '600',
  borderRadius: '9999px',
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
  padding: '0 1.5rem',
  marginBottom: 0,
  // The four tabs don't fit across a phone-width modal; allow horizontal
  // scrolling so every tab stays reachable instead of overflowing/clipping.
  overflowX: 'auto',
});

globalStyle(`${content} [role="tablist"] > button`, {
  whiteSpace: 'nowrap',
});

globalStyle(`${content} [role="tabpanel"]`, {
  padding: '1.5rem',
});

export const timelineContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  padding: '1rem 0',
});

export const timelineItem = style({
  display: 'flex',
  gap: '1rem',
  position: 'relative',
  padding: '1rem',
  background: '#fafbfc',
  border: '1px solid #e1e5e9',
  borderRadius: '0.5rem',
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
    fontSize: '1rem',
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
  gap: '1rem',
  marginBottom: '0.75rem',
});

export const timelineTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: 0,
  flex: 1,
});

export const timelineTimestamp = style({
  fontSize: '0.8125rem',
  color: '#6b7280',
  whiteSpace: 'nowrap',
  background: '#f3f4f6',
  padding: '0.25rem 0.5rem',
  borderRadius: '0.25rem',
  fontWeight: '500',
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
  padding: '0.25rem 0.5rem',
  background: '#f9fafb',
  borderRadius: '0.25rem',
  display: 'inline-block',
});

export const timelineData = style({
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  padding: '1rem',
  margin: '0.75rem 0',
  fontSize: '0.8125rem',
});

globalStyle(`${timelineData} strong`, {
  color: '#374151',
  display: 'block',
  marginBottom: '0.5rem',
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
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const addEventTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 1rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  selectors: {
    '&::before': {
      content: "'✏️'",
      fontSize: '1.2em',
    },
  },
});

export const formRow = style({
  display: 'flex',
  gap: '1rem',
  marginBottom: '1rem',
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
  marginTop: '1rem',
});

export const section = style({
  marginBottom: '2rem',
});

export const sectionHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
});

export const sectionTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 1rem 0',
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
});

export const card = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1.5rem',
});

export const cardTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.75rem 0',
});

export const field = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: '0.5rem',
});

export const fieldLabel = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  fontWeight: '500',
});

export const fieldValue = style({
  fontSize: '0.875rem',
  color: '#111827',
  textAlign: 'right',
  maxWidth: '60%',
});

export const fieldValueFullWidth = style({
  fontSize: '0.875rem',
  color: '#111827',
  marginTop: '0.5rem',
  lineHeight: '1.5',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
});

export const fieldVertical = style({
  marginBottom: '1rem',
});

export const statusUpdateContainer = style({
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  margin: '1rem 0',
});

export const formField = style({
  marginBottom: '1rem',
});

export const referenceCard = style({
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  marginBottom: '1rem',
});

export const referenceHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: '1rem',
});

export const referenceInfo = style({});

export const referenceName = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
});

export const referenceContact = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0.25rem 0',
});

export const referenceRelation = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: 0,
});

export const referenceNotes = style({
  fontSize: '0.875rem',
  color: '#374151',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.75rem',
  marginTop: '1rem',
});

export const referenceActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: '1rem',
});

export const referenceForm = style({
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '1rem',
  marginTop: '1rem',
  border: '1px solid #e5e7eb',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
});

export const scheduleVisitForm = style({
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const scheduleVisitTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 1rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
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
  borderRadius: '0.5rem',
  padding: '1.5rem',
  marginBottom: '1rem',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
});

export const visitHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'start',
  marginBottom: '1rem',
});

export const visitInfo = style({});

export const visitDate = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
});

export const visitTime = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: '0.25rem 0',
});

export const visitStaff = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  margin: 0,
});

export const visitNotes = style({
  fontSize: '0.875rem',
  color: '#374151',
  background: '#f9fafb',
  borderRadius: '0.375rem',
  padding: '0.75rem',
  margin: '1rem 0',
});

globalStyle(`${visitNotes} strong`, {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#1f2937',
});

export const visitCompletedInfo = style({
  margin: '1rem 0',
});

export const visitActions = style({
  display: 'flex',
  gap: '0.5rem',
  marginTop: '1rem',
  flexWrap: 'wrap',
});

export const rescheduleForm = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginTop: '1rem',
});

export const rescheduleTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#92400e',
  margin: '0 0 1rem 0',
});

export const completeVisitForm = style({
  background: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: '0.5rem',
  padding: '1rem',
  marginTop: '1rem',
});

export const completeVisitTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#047857',
  margin: '0 0 1rem 0',
});

export const noStatusOptionsText = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.25rem',
});

export const statusChangeBlock = style({
  marginTop: '0.5rem',
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
