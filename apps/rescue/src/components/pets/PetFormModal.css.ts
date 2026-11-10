import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

// ADS-646: small banner above the form explaining that only the name is
// required up-front. Keeps the form approachable for new staff without
// hiding the optional fields.
export const minimalFieldsHint = style({
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1e40af',
  padding: '0.75rem 1rem',
  borderRadius: vars.border.radius.base,
  marginBottom: '1.25rem',
  fontSize: vars.typography.size.sm,
  lineHeight: 1.5,
});

export const formGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
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
  fontSize: vars.typography.size.xs,
  marginTop: vars.spacing['1'],
});

globalStyle(`${formGroup.classNames.base} label`, {
  display: 'block',
  marginBottom: vars.spacing['2'],
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  color: '#111827',
});

globalStyle(
  `${formGroup.classNames.base} input, ${formGroup.classNames.base} select, ${formGroup.classNames.base} textarea`,
  {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: vars.border.radius.sm,
    fontSize: vars.typography.size.sm,
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
  gap: vars.spacing['2'],
  marginTop: vars.spacing['2'],
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
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['5'],
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e5e7eb',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column-reverse',
    },
  },
});

export const submitError = style({
  color: '#ef4444',
  marginBottom: vars.spacing['3'],
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
  fontSize: vars.typography.size.sm,
  pointerEvents: 'none',
});

globalStyle(`${currencyInputWrapper} input`, {
  paddingLeft: '1.75rem',
});

// ── Image uploader (ADS-574) ─────────────────────────────────────────────────

export const imageHelper = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
  marginTop: vars.spacing['2'],
});

export const imageList = style({
  listStyle: 'none',
  margin: `${vars.spacing['3']} 0 0 0`,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const imageItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: vars.spacing['2'],
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.sm,
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
  borderRadius: vars.border.radius.sm,
  border: '1px solid #d1d5db',
});

export const imageThumbPlaceholder = style({
  width: '56px',
  height: '56px',
  borderRadius: vars.border.radius.sm,
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
  fontWeight: vars.typography.weight.semibold,
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
  fontSize: vars.typography.size.sm,
  color: '#111827',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const imageStatus = style({
  fontSize: vars.typography.size.xs,
  color: '#6b7280',
});

export const imageStatusError = style({
  fontSize: vars.typography.size.xs,
  color: '#ef4444',
});

export const imageActions = style({
  display: 'flex',
  gap: vars.spacing['1'],
});

globalStyle(`${imageActions} button`, {
  fontSize: vars.typography.size.xs,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: vars.border.radius.sm,
  cursor: 'pointer',
});

globalStyle(`${imageActions} button:disabled`, {
  color: '#9ca3af',
  cursor: 'not-allowed',
});
