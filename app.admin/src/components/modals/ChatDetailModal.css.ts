import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const modalContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
  maxHeight: '80vh',
  minHeight: '600px',
});

export const chatHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const chatTitle = style({
  margin: '0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

export const chatId = style({
  fontSize: '0.875rem',
  color: '#6b7280',
  fontFamily: "'Courier New', monospace",
});

export const tabBar = style({
  display: 'flex',
  gap: '0.5rem',
  borderBottom: '1px solid #e5e7eb',
});

export const tab = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.2s ease',
    selectors: {
      '& svg': {
        fontSize: '1rem',
      },
    },
  },
  variants: {
    active: {
      true: {
        background: '#3b82f6',
        color: '#ffffff',
        ':hover': {
          background: '#3b82f6',
        },
      },
      false: {
        background: 'transparent',
        color: '#6b7280',
        ':hover': {
          background: '#f3f4f6',
        },
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const tabContent = style({
  flex: '1',
  overflowY: 'auto',
  padding: '1rem 0',
});

export const messageTimeline = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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

export const messageAvatar = style({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: '#e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6b7280',
  flexShrink: '0',
});

export const messageContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const messageHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
});

export const messageSender = style({
  fontWeight: '600',
  color: '#111827',
});

export const messageTime = style({
  color: '#9ca3af',
});

export const messageBody = recipe({
  base: {
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
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
  gap: '0.5rem',
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
  selectors: {
    '& svg': {
      fontSize: '0.875rem',
    },
  },
});

export const participantList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const participantCard = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
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
  fontSize: '1rem',
  fontWeight: '600',
  color: '#6b7280',
  flexShrink: '0',
});

export const participantInfo = style({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const participantName = style({
  fontWeight: '600',
  color: '#111827',
  fontSize: '0.875rem',
});

export const participantRole = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  variants: {
    variant: {
      success: { background: '#d1fae5', color: '#065f46' },
      warning: { background: '#fef3c7', color: '#92400e' },
      danger: { background: '#fee2e2', color: '#991b1b' },
      neutral: { background: '#f3f4f6', color: '#374151' },
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.5rem',
  '@media': {
    '(max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const detailItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const detailLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  selectors: {
    '& svg': {
      fontSize: '1rem',
    },
  },
});

export const detailValue = style({
  fontSize: '0.875rem',
  color: '#111827',
  fontWeight: '500',
});

export const actionBar = style({
  display: 'flex',
  gap: '0.75rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
  flexWrap: 'wrap',
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  padding: '3rem',
  color: '#9ca3af',
  textAlign: 'center',
  selectors: {
    '& svg': {
      fontSize: '3rem',
    },
  },
});

export const loadingState = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem',
  color: '#9ca3af',
});

export const deletePrompt = style({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '10000',
});

export const deletePromptContent = style({
  background: 'white',
  padding: '2rem',
  borderRadius: '12px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
});

export const deletePromptTitle = style({
  margin: '0 0 1rem 0',
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  selectors: {
    '& svg': {
      color: '#ef4444',
    },
  },
});

export const deletePromptText = style({
  margin: '0 0 1.5rem 0',
  fontSize: '0.875rem',
  color: '#6b7280',
  lineHeight: '1.5',
});

export const textArea = style({
  width: '100%',
  minHeight: '100px',
  padding: '0.75rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  resize: 'vertical',
  marginBottom: '1.5rem',
  ':focus': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const deletePromptActions = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
});
