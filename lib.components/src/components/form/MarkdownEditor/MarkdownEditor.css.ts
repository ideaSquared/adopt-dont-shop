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
  padding: vars.spacing['3'],
  backgroundColor: vars.background.body,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
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
  right: vars.spacing['2'],
  bottom: vars.spacing['2'],
  fontSize: vars.typography.size.xs,
  color: vars.text.secondary,
  pointerEvents: 'none',
});
