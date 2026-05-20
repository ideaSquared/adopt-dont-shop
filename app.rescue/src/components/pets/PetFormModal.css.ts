import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

export const modalOverlay = style({
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
  maxWidth: '800px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '2rem',
});

globalStyle(`${modalContent} h2`, {
  margin: '0 0 1.5rem 0',
  color: '#111827',
  fontSize: '1.5rem',
  fontWeight: '600',
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1.5rem',
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = recipe({
  base: {},
  variants: {
    fullWidth: {
      true: { gridColumn: '1 / -1' },
      false: {},
    },
  },
  defaultVariants: {
    fullWidth: false,
  },
});

globalStyle(`${formGroup.classNames.base} .error`, {
  color: '#ef4444',
  fontSize: '0.75rem',
  marginTop: '0.25rem',
});

globalStyle(`${formGroup.classNames.base} label`, {
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: '500',
  fontSize: '0.875rem',
  color: '#111827',
});

globalStyle(
  `${formGroup.classNames.base} input, ${formGroup.classNames.base} select, ${formGroup.classNames.base} textarea`,
  {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
  }
);

globalStyle(`${formGroup.classNames.base} textarea`, {
  resize: 'vertical',
  minHeight: '100px',
});

export const checkboxGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '0.5rem',
});

globalStyle(`${checkboxGroup} input[type="checkbox"]`, {
  width: 'auto',
});

globalStyle(`${checkboxGroup} label`, {
  margin: 0,
  fontWeight: 'normal',
});

export const modalActions = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1rem',
  borderTop: '1px solid #e5e7eb',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column-reverse',
    },
  },
});

export const submitError = style({
  color: '#ef4444',
  marginBottom: '1rem',
});

export const currencyInputWrapper = style({
  position: 'relative',
});

export const currencyAdornment = style({
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#6b7280',
  fontSize: '0.875rem',
  pointerEvents: 'none',
});

globalStyle(`${currencyInputWrapper} input`, {
  paddingLeft: '1.75rem',
});

// ── Image uploader (ADS-574) ─────────────────────────────────────────────────

export const imageHelper = style({
  fontSize: '0.75rem',
  color: '#6b7280',
  marginTop: '0.5rem',
});

export const imageList = style({
  listStyle: 'none',
  margin: '1rem 0 0 0',
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const imageItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.5rem',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  background: '#fff',
});

export const imageThumbWrapper = style({
  position: 'relative',
  width: '56px',
  height: '56px',
  flexShrink: 0,
});

export const imageThumb = style({
  width: '56px',
  height: '56px',
  objectFit: 'cover',
  borderRadius: '4px',
  border: '1px solid #d1d5db',
});

export const imageThumbPlaceholder = style({
  width: '56px',
  height: '56px',
  borderRadius: '4px',
  background: '#f3f4f6',
  border: '1px dashed #d1d5db',
});

export const primaryBadge = style({
  position: 'absolute',
  bottom: '-6px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#2563eb',
  color: '#fff',
  fontSize: '0.625rem',
  fontWeight: 600,
  padding: '0.125rem 0.375rem',
  borderRadius: '999px',
  whiteSpace: 'nowrap',
});

export const imageMeta = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const imageFilename = style({
  fontSize: '0.875rem',
  color: '#111827',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const imageStatus = style({
  fontSize: '0.75rem',
  color: '#6b7280',
});

export const imageStatusError = style({
  fontSize: '0.75rem',
  color: '#ef4444',
});

export const imageActions = style({
  display: 'flex',
  gap: '0.25rem',
});

globalStyle(`${imageActions} button`, {
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: '4px',
  cursor: 'pointer',
});

globalStyle(`${imageActions} button:disabled`, {
  color: '#9ca3af',
  cursor: 'not-allowed',
});
