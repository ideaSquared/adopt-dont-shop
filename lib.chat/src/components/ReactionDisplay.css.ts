import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const reactionsRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.25rem',
  marginTop: '0.25rem',
});

const reactionBadgeBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
  padding: '0.125rem 0.375rem',
  borderRadius: '12px',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  lineHeight: '1.4',
  transition: 'all 0.15s ease',
  selectors: {
    '&:active': {
      transform: 'scale(0.95)',
    },
  },
});

export const reactionBadge = styleVariants({
  active: [
    reactionBadgeBase,
    {
      border: `1px solid ${vars.colors.primary['300']}`,
      background: vars.colors.primary['50'],
      selectors: {
        '&:hover': {
          background: vars.colors.primary['100'],
          transform: 'scale(1.05)',
        },
      },
    },
  ],
  inactive: [
    reactionBadgeBase,
    {
      border: `1px solid ${vars.border.color.secondary}`,
      background: vars.background.primary,
      selectors: {
        '&:hover': {
          background: vars.background.secondary,
          transform: 'scale(1.05)',
        },
      },
    },
  ],
});

export const reactionEmoji = style({
  fontSize: '0.875rem',
  lineHeight: '1',
});

export const reactionCount = style({
  fontSize: '0.6875rem',
  fontWeight: '600',
  color: vars.text.secondary,
});
