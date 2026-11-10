import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = style({
  marginBottom: vars.spacing['3'],
  background: vars.background.body,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
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
    background: vars.background.surface,
  },
});

export const iconWrap = style({
  fontSize: vars.typography.size.xl,
  lineHeight: 1,
});

export const titleWrap = style({
  flex: 1,
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
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
  gap: vars.spacing['1'],
  padding: '0.125rem 0.5rem',
  marginLeft: vars.spacing['2'],
  fontSize: '0.6875rem',
  fontWeight: vars.typography.weight.semibold,
  color: vars.colors.warningActive,
  background: vars.colors.warningBgSubtle,
  border: `1px solid ${vars.colors.warningBorderSubtle}`,
  borderRadius: vars.border.radius.pill,
  verticalAlign: 'middle',
});

export const body = style({
  padding: '0 1.25rem 1.25rem',
  borderTop: `1px solid ${vars.border.color.default}`,
  paddingTop: vars.spacing['3'],
});
