import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

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

export const petImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '3rem',
  color: '#9ca3af',
  background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
});

export const statusBadgeContainer = style({
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
});

export const petContent = style({
  padding: '1.25rem',
});

export const petHeader = style({
  marginBottom: '1rem',
  selectors: {
    '& .pet-info': {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: 0,
    },
  },
});

globalStyle(`${petHeader} h3`, {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 0.25rem 0',
  lineHeight: '1.2',
});

export const petDetails = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
  marginBottom: '1rem',
  fontSize: '0.875rem',
  selectors: {
    '& .detail-item': {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.25rem 0',
      borderBottom: '1px solid #f3f4f6',
    },
    '& .detail-item .label': {
      color: '#6b7280',
      fontWeight: '500',
    },
    '& .detail-item .value': {
      color: '#111827',
    },
  },
});

export const petDescription = style({
  marginBottom: '1rem',
});

globalStyle(`${petDescription} p`, {
  fontSize: '0.875rem',
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
  gap: '0.5rem',
  marginTop: '1rem',
});

globalStyle(`${petActions} button`, {
  flex: 1,
  fontSize: '0.875rem',
});

export const statusUpdateModal = style({
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
  padding: '1rem',
});

export const modalContent = style({
  width: '100%',
  maxWidth: '400px',
  padding: '1.5rem',
});

globalStyle(`${modalContent} h3`, {
  margin: '0 0 1rem 0',
  color: '#111827',
});

globalStyle(`${modalContent} .form-group`, {
  marginBottom: '1rem',
});

globalStyle(`${modalContent} .form-group label`, {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  color: '#111827',
});

globalStyle(`${modalContent} .form-group select, ${modalContent} .form-group textarea`, {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
});

globalStyle(`${modalContent} .form-group textarea`, {
  resize: 'vertical',
  minHeight: '80px',
});

globalStyle(`${modalContent} .modal-actions`, {
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  marginTop: '1.5rem',
});

globalStyle(`${modalContent} .modal-actions button`, {
  minWidth: '80px',
});

globalStyle(`${modalContent} .form-actions`, {
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  marginTop: '1.5rem',
});

globalStyle(`${modalContent} .form-actions button`, {
  minWidth: '80px',
});

export const statusBadge = recipe({
  base: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    borderRadius: '4px',
    textTransform: 'capitalize',
    color: 'white',
  },
  variants: {
    status: {
      available: { backgroundColor: '#10b981' },
      pending: { backgroundColor: '#f59e0b' },
      adopted: { backgroundColor: '#3b82f6' },
      on_hold: { backgroundColor: '#f97316' },
      medical_care: { backgroundColor: '#ef4444' },
      foster: { backgroundColor: '#8b5cf6' },
      default: { backgroundColor: '#6b7280' },
    },
  },
  defaultVariants: {
    status: 'default',
  },
});
