import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = style({
  marginBottom: '1rem',
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '0.75rem',
  overflow: 'hidden',
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  width: '100%',
  padding: '1rem 1.25rem',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  color: vars.text.primary,
  ':hover': {
    background: vars.background.secondary,
  },
});

export const iconWrap = style({
  fontSize: '1.25rem',
  lineHeight: 1,
});

export const titleWrap = style({
  flex: 1,
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: '1rem',
  fontWeight: 600,
});

export const summary = style({
  margin: '0.125rem 0 0 0',
  fontSize: '0.8125rem',
  color: vars.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

export const chevron = recipe({
  base: {
    fontSize: '0.8125rem',
    color: vars.text.secondary,
    transition: 'transform 0.15s ease',
  },
  variants: {
    expanded: {
      true: { transform: 'rotate(180deg)' },
      false: { transform: 'rotate(0deg)' },
    },
  },
  defaultVariants: { expanded: false },
});

export const attentionBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.125rem 0.5rem',
  marginLeft: '0.5rem',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: vars.colors.semantic.warning['700'],
  background: vars.colors.semantic.warning['50'],
  border: `1px solid ${vars.colors.semantic.warning['200']}`,
  borderRadius: '9999px',
  verticalAlign: 'middle',
});

export const body = style({
  padding: '0 1.25rem 1.25rem',
  borderTop: `1px solid ${vars.border.color.primary}`,
  paddingTop: '1rem',
});
