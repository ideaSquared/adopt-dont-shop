import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const styledCard = style({
  padding: 0,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  border: '1px solid #e5e7eb',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
  },
});

export const petImageContainer = style({
  position: 'relative',
  width: '100%',
  height: '200px',
  background: '#f3f4f6',
  overflow: 'hidden',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: vars.typography.size['5xl'],
  color: '#9ca3af',
  background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
});

export const statusBadgeContainer = style({
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
});

// ADS-646: bulk-select checkbox overlay in the top-left of the card image.
export const selectCheckboxLabel = style({
  position: 'absolute',
  top: '0.75rem',
  left: '0.75rem',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.75rem',
  height: '1.75rem',
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: vars.border.radius.sm,
  border: '1px solid #d1d5db',
  cursor: 'pointer',
});

globalStyle(`${selectCheckboxLabel} input[type="checkbox"]`, {
  width: '1rem',
  height: '1rem',
  cursor: 'pointer',
  margin: 0,
});

// ADS-646: inline status dropdown styled to match the outline-sm buttons it
// sits next to in the action row, so the card actions read as a single
// cohesive control strip.
export const inlineStatusLabel = style({
  flex: 1,
  display: 'flex',
});

export const inlineStatusSrOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
});

export const inlineStatusSelect = style({
  width: '100%',
  height: '32px',
  padding: `0 ${vars.spacing['2']}`,
  borderRadius: '0.375rem',
  border: '1px solid #d1d5db',
  background: 'white',
  fontSize: vars.typography.size.sm,
  color: '#111827',
  cursor: 'pointer',
});

export const petContent = style({
  padding: '1.25rem',
});

export const petHeader = style({
  marginBottom: vars.spacing['3'],
});

globalStyle(`${petHeader} .pet-info`, {
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  margin: 0,
});

globalStyle(`${petHeader} h3`, {
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  color: '#111827',
  margin: `0 0 ${vars.spacing['1']} 0`,
  lineHeight: '1.2',
});

export const petDetails = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['2'],
  marginBottom: vars.spacing['3'],
  fontSize: vars.typography.size.sm,
});

globalStyle(`${petDetails} .detail-item`, {
  display: 'flex',
  justifyContent: 'space-between',
  padding: `${vars.spacing['1']} 0`,
  borderBottom: '1px solid #f3f4f6',
});

globalStyle(`${petDetails} .detail-item .label`, {
  color: '#6b7280',
  fontWeight: vars.typography.weight.medium,
});

globalStyle(`${petDetails} .detail-item .value`, {
  color: '#111827',
});

export const petDescription = style({
  marginBottom: vars.spacing['3'],
});

globalStyle(`${petDescription} p`, {
  fontSize: vars.typography.size.sm,
  color: '#6b7280',
  lineHeight: '1.4',
  margin: 0,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

export const petActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['3'],
});

globalStyle(`${petActions} button`, {
  flex: 1,
  fontSize: vars.typography.size.sm,
});

export const statusLink = style({
  display: 'inline-flex',
  textDecoration: 'none',
});

export const modalActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['5'],
});

export const dangerText = style({
  color: '#ef4444',
});

export const deleteWarning = style({
  marginBottom: vars.spacing['3'],
  color: '#666',
});
