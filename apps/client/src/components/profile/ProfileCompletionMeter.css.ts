import { style } from '@vanilla-extract/css';

export const meter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  background: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: '12px',
  margin: '0 0 1rem 0',
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const headerLabel = style({
  fontWeight: 600,
  color: '#333',
});

export const dismissButton = style({
  background: 'transparent',
  border: 'none',
  fontSize: '1.25rem',
  color: '#6c757d',
  cursor: 'pointer',
  padding: '0 0.25rem',
  lineHeight: 1,
  ':hover': { color: '#333' },
});

export const segments = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '0.5rem',
});

const segmentBase = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start' as const,
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'background 120ms ease',
};

export const segmentDone = style({
  ...segmentBase,
  background: '#e9f7f6',
  color: '#1f7a73',
  ':hover': { background: '#d6f0ee' },
});

export const segmentTodo = style({
  ...segmentBase,
  background: '#f8f9fa',
  color: '#333',
  border: '1px dashed #adb5bd',
  ':hover': { background: '#e9ecef' },
});

export const segmentLabel = style({
  fontWeight: 600,
});

export const segmentStatus = style({
  fontSize: '0.75rem',
  opacity: 0.8,
});

export const celebration = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '1rem',
  background: 'linear-gradient(135deg, #4ecdc4 0%, #45b7b8 100%)',
  color: 'white',
  borderRadius: '12px',
  margin: '0 0 1rem 0',
});

export const celebrationIcon = style({
  fontSize: '2rem',
});

export const celebrationBody = style({
  flex: 1,
});

export const celebrationTitle = style({
  fontSize: '1.1rem',
  fontWeight: 700,
  margin: '0 0 0.25rem 0',
});

export const celebrationSubtitle = style({
  fontSize: '0.9rem',
  margin: 0,
  opacity: 0.95,
});

export const celebrationClose = style({
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0 0.5rem',
  lineHeight: 1,
});
