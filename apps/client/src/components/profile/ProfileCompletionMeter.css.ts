import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const meter = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: '0.75rem 1rem',
  background: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: vars.border.radius.lg,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const headerLabel = style({
  fontWeight: vars.typography.weight.semibold,
  color: '#333',
});

export const dismissButton = style({
  background: 'transparent',
  border: 'none',
  fontSize: vars.typography.size.xl,
  color: '#6c757d',
  cursor: 'pointer',
  padding: `0 ${vars.spacing['1']}`,
  lineHeight: 1,
  ':hover': { color: '#333' },
});

export const segments = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: vars.spacing['2'],
});

const segmentBase = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start' as const,
  padding: '0.5rem 0.75rem',
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
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
  fontWeight: vars.typography.weight.semibold,
});

export const segmentStatus = style({
  fontSize: vars.typography.size.xs,
  opacity: 0.8,
});

export const celebration = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: vars.spacing['3'],
  background: 'linear-gradient(135deg, #4ecdc4 0%, #45b7b8 100%)',
  color: 'white',
  borderRadius: vars.border.radius.lg,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

export const celebrationIcon = style({
  fontSize: '2rem',
});

export const celebrationBody = style({
  flex: 1,
});

export const celebrationTitle = style({
  fontSize: '1.1rem',
  fontWeight: vars.typography.weight.bold,
  margin: `0 0 ${vars.spacing['1']} 0`,
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
  fontSize: vars.typography.size['2xl'],
  cursor: 'pointer',
  padding: `0 ${vars.spacing['2']}`,
  lineHeight: 1,
});
