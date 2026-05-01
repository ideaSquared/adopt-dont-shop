import { style } from '@vanilla-extract/css';
import { vars } from '../../styles/theme.css';

export const messageText = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.relaxed,
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['6'],
});
