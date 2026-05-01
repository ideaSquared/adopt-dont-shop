import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const editorContainer = style({
  flex: 1,
  minWidth: 0,
  position: 'relative',
});

export const textarea = style({
  width: '100%',
  height: '150px',
  padding: vars.spacing.md,
  backgroundColor: vars.background.primary,
  border: `${vars.border.width.thin} solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  fontFamily: 'monospace',
  fontSize: vars.typography.size.sm,
  lineHeight: '1.5',
  resize: 'none',
  color: vars.text.primary,

  selectors: {
    '&::placeholder': {
      color: vars.text.secondary,
    },
    '&:focus': {
      outline: 'none',
      borderColor: vars.border.color.focus,
    },
    '&:disabled': {
      backgroundColor: vars.background.disabled,
      cursor: 'not-allowed',
    },
  },
});

export const markdownHint = style({
  position: 'absolute',
  right: vars.spacing.sm,
  bottom: vars.spacing.sm,
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
  pointerEvents: 'none',
});
