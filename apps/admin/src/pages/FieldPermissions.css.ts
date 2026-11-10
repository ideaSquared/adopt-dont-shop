import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const roleSelector = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
});

export const fieldName = style({
  fontFamily: "'Fira Code', 'Consolas', monospace",
  fontSize: '0.8rem',
  padding: '0.125rem 0.375rem',
  background: vars.background.muted,
  borderRadius: '4px',
});

const accessSelect = style({
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: `1px solid ${vars.border.color.muted}`,
  fontSize: '0.8rem',
  fontWeight: '500',
  cursor: 'pointer',
});

export const accessSelectWrite = style([
  accessSelect,
  {
    background: vars.colors.successBgSubtle,
    color: vars.colors.successTextEmphasis,
  },
]);

export const accessSelectRead = style([
  accessSelect,
  {
    background: vars.colors.infoBgSubtle,
    color: vars.colors.infoTextEmphasis,
  },
]);

export const accessSelectNone = style([
  accessSelect,
  {
    background: vars.colors.dangerBgSubtle,
    color: vars.colors.dangerTextEmphasis,
  },
]);

export const accessSelectDefault = style([
  accessSelect,
  {
    background: vars.background.surface,
    color: vars.text.secondary,
  },
]);
