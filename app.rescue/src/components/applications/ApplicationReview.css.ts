import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

const spin = keyframes({
  '0%': { transform: 'rotate(0deg)' },
  '100%': { transform: 'rotate(360deg)' },
});

export const overlay = style({
  position: 'fixed',
  inset: 0,
  background: 'rgba(75, 85, 99, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
});

export const modal = style({
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  maxWidth: '72rem',
  width: '100%',
  margin: '1rem',
  maxHeight: '90vh',
  overflow: 'hidden',
});

export const loadingContainer = style({
  background: 'white',
  borderRadius: '0.5rem',
  padding: '2rem',
  textAlign: 'center',
});

export const spinner = style({
  display: 'inline-block',
  width: '2rem',
  height: '2rem',
  border: '2px solid #e5e7eb',
  borderTop: '2px solid #3b82f6',
  borderRadius: '50%',
  animation: `${spin} 1s linear infinite`,
});

export const loadingText = style({
  marginTop: '0.5rem',
  fontSize: '0.875rem',
  color: '#6b7280',
});

export const errorContainer = style({
  background: 'white',
  borderRadius: '0.5rem',
  padding: '2rem',
  maxWidth: '28rem',
});

export const errorText = style({
  color: '#ef4444',
  marginBottom: '1rem',
});

export const errorMessage = style({
  fontSize: '0.875rem',
  color: '#374151',
  marginBottom: '1rem',
});

export const closeButton = style({
  padding: '0.5rem 1rem',
  background: '#d1d5db',
  color: '#374151',
  borderRadius: '0.375rem',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  ':hover': {
    background: '#9ca3af',
  },
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
});

export const headerLeft = style({
  display: 'flex',
  flexDirection: 'column',
});

export const headerTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#111827',
  margin: 0,
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
});

export const statusBadge = recipe({
  base: {
    display: 'inline-flex',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
  },
  variants: {
    status: {
      submitted: { background: '#dbeafe', color: '#1e40af' },
      approved: { background: '#dcfce7', color: '#166534' },
      rejected: { background: '#fecaca', color: '#dc2626' },
      withdrawn: { background: '#f3f4f6', color: '#374151' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    status: 'default',
  },
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

export const button = recipe({
  base: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  variants: {
    variant: {
      primary: {
        background: '#3b82f6',
        color: 'white',
        ':hover': { background: '#2563eb' },
        ':disabled': { background: '#9ca3af', cursor: 'not-allowed' },
      },
      secondary: {
        background: '#f3f4f6',
        color: '#374151',
        ':hover': { background: '#e5e7eb' },
        ':disabled': { opacity: 0.5, cursor: 'not-allowed' },
      },
      danger: {
        background: '#ef4444',
        color: 'white',
        ':hover': { background: '#dc2626' },
      },
    },
  },
  defaultVariants: {
    variant: 'secondary',
  },
});

export const tabContainer = style({
  borderBottom: '1px solid #e5e7eb',
  background: 'white',
});

export const tabList = style({
  display: 'flex',
  padding: '0 1.5rem',
});

export const tab = recipe({
  base: {
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    ':hover': {
      color: '#3b82f6',
    },
  },
  variants: {
    active: {
      true: {
        color: '#3b82f6',
        borderBottomColor: '#3b82f6',
      },
      false: {
        color: '#6b7280',
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const content = style({
  overflowY: 'auto',
  maxHeight: 'calc(90vh - 120px)',
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

export const formLabel = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.5rem',
});

export const formSelect = style({
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  background: 'white',
  transition: 'border-color 0.2s ease',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const formTextarea = style({
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  minHeight: '5rem',
  resize: 'vertical',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  '::placeholder': {
    color: '#9ca3af',
  },
});

export const formActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  marginTop: '1rem',
});

export const emptyTimeline = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: '#6b7280',
  background: '#fafbfc',
  border: '2px dashed #d1d5db',
  borderRadius: '0.75rem',
});

globalStyle(`${emptyTimeline} p`, {
  margin: '0 0 0.5rem 0',
});

globalStyle(`${emptyTimeline} p:first-child`, {
  fontSize: '1.125rem',
  fontWeight: '500',
  color: '#4b5563',
  marginBottom: '1rem',
});

globalStyle(`${emptyTimeline} p:last-child`, {
  fontSize: '0.9375rem',
  lineHeight: '1.5',
});

export const tabPanel = recipe({
  base: {
    padding: '1.5rem',
  },
  variants: {
    active: {
      true: { display: 'block' },
      false: { display: 'none' },
    },
  },
  defaultVariants: {
    active: false,
  },
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

export const label = style({
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#374151',
  marginBottom: '0.25rem',
});

export const select = style({
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  background: 'white',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const textArea = style({
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  resize: 'vertical',
  minHeight: '100px',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
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

export const referenceStatus = recipe({
  base: {
    display: 'inline-flex',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
  },
  variants: {
    status: {
      verified: { background: '#dcfce7', color: '#166534' },
      contacted: { background: '#fef3c7', color: '#92400e' },
      pending: { background: '#f3f4f6', color: '#374151' },
      failed: { background: '#fecaca', color: '#dc2626' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    status: 'default',
  },
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

export const statusSelect = style({
  padding: '0.375rem 0.5rem',
  fontSize: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  background: 'white',
  marginBottom: '0.5rem',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
  },
});

export const notesInput = style({
  width: '100%',
  padding: '0.5rem',
  fontSize: '0.875rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  resize: 'vertical',
  minHeight: '80px',
  margin: '0.5rem 0',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)',
  },
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

export const formInput = style({
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  background: 'white',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const emptyVisits = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: '#6b7280',
  background: '#fafbfc',
  border: '2px dashed #d1d5db',
  borderRadius: '0.75rem',
});

globalStyle(`${emptyVisits} p`, {
  margin: '0 0 0.5rem 0',
});

globalStyle(`${emptyVisits} p:first-child`, {
  fontSize: '1.125rem',
  fontWeight: '500',
  color: '#4b5563',
  marginBottom: '1rem',
});

globalStyle(`${emptyVisits} p:last-child`, {
  fontSize: '0.9375rem',
  lineHeight: '1.5',
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

export const visitStatus = recipe({
  base: {
    display: 'inline-flex',
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
  },
  variants: {
    status: {
      scheduled: { background: '#dbeafe', color: '#1e40af' },
      in_progress: { background: '#fef3c7', color: '#92400e' },
      completed: { background: '#dcfce7', color: '#166534' },
      cancelled: { background: '#fecaca', color: '#dc2626' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    status: 'default',
  },
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

export const visitOutcome = recipe({
  base: {
    display: 'inline-flex',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    borderRadius: '9999px',
  },
  variants: {
    outcome: {
      approved: { background: '#dcfce7', color: '#166534' },
      conditional: { background: '#fef3c7', color: '#92400e' },
      rejected: { background: '#fecaca', color: '#dc2626' },
      default: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    outcome: 'default',
  },
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

export const visitDetailsModal = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

export const visitDetailsContent = style({
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
  width: '90%',
  maxHeight: '80vh',
  overflowY: 'auto',
});

export const visitDetailsHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  borderBottom: '1px solid #e5e7eb',
});

globalStyle(`${visitDetailsHeader} h4`, {
  margin: 0,
  fontSize: '1rem',
  fontWeight: '600',
  color: '#111827',
});
