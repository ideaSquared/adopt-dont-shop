import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '../../../lib.components/src/styles/theme.css';

export const messageBubbleWrapper = style({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  width: '100%',
});

export const messageBubbleWrapperOwn = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  position: 'relative',
  width: '100%',
});

export const messageBubbleWrapperOther = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  position: 'relative',
  width: '100%',
});

export const bubbleRowOwn = style({
  display: 'flex',
  flexDirection: 'row-reverse',
  alignItems: 'center',
  gap: '0.25rem',
});

export const bubbleRowOther = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '0.25rem',
});

const bubbleBase = style({
  maxWidth: '70%',
  display: 'flex',
  flexDirection: 'column',
  padding: '0.5rem 0.875rem',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
  fontSize: '0.9375rem',
  lineHeight: '1.45',
  position: 'relative',
  transition: 'background 0.12s ease',
  '@media': {
    '(max-width: 600px)': {
      maxWidth: '82%',
      fontSize: '0.9rem',
      padding: '0.4375rem 0.75rem',
    },
  },
});

export const messageBubbleOwn = styleVariants({
  single: [
    bubbleBase,
    {
      borderRadius: '18px 18px 4px 18px',
      background: vars.colors.primary['600'],
      color: vars.text.inverse,
      border: 'none',
    },
  ],
  first: [
    bubbleBase,
    {
      borderRadius: '18px 18px 4px 18px',
      background: vars.colors.primary['600'],
      color: vars.text.inverse,
      border: 'none',
    },
  ],
  middle: [
    bubbleBase,
    {
      borderRadius: '18px 4px 4px 18px',
      background: vars.colors.primary['600'],
      color: vars.text.inverse,
      border: 'none',
    },
  ],
  last: [
    bubbleBase,
    {
      borderRadius: '18px 4px 18px 18px',
      background: vars.colors.primary['600'],
      color: vars.text.inverse,
      border: 'none',
    },
  ],
});

export const messageBubbleOther = styleVariants({
  single: [
    bubbleBase,
    {
      borderRadius: '18px 18px 18px 4px',
      background: vars.background.secondary,
      color: vars.text.primary,
      border: `1px solid ${vars.border.color.tertiary}`,
    },
  ],
  first: [
    bubbleBase,
    {
      borderRadius: '18px 18px 18px 4px',
      background: vars.background.secondary,
      color: vars.text.primary,
      border: `1px solid ${vars.border.color.tertiary}`,
    },
  ],
  middle: [
    bubbleBase,
    {
      borderRadius: '4px 18px 18px 4px',
      background: vars.background.secondary,
      color: vars.text.primary,
      border: `1px solid ${vars.border.color.tertiary}`,
    },
  ],
  last: [
    bubbleBase,
    {
      borderRadius: '4px 18px 18px 18px',
      background: vars.background.secondary,
      color: vars.text.primary,
      border: `1px solid ${vars.border.color.tertiary}`,
    },
  ],
});

export const messageContent = style({
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
});

export const messageMetaOwn = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  margin: '0.25rem 0.25rem 0 0.25rem',
  fontSize: '0.6875rem',
  color: vars.text.tertiary,
  whiteSpace: 'nowrap',
  letterSpacing: '0.01em',
  userSelect: 'none',
  fontWeight: '500',
  transition: 'opacity 0.15s ease',
  alignSelf: 'flex-end',
});

export const messageMetaOther = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
  margin: '0.25rem 0.25rem 0 0.25rem',
  fontSize: '0.6875rem',
  color: vars.text.tertiary,
  whiteSpace: 'nowrap',
  letterSpacing: '0.01em',
  userSelect: 'none',
  fontWeight: '500',
  transition: 'opacity 0.15s ease',
  alignSelf: 'flex-start',
});

export const messageMetaVisible = style({ opacity: '1' });
export const messageMetaHidden = style({ opacity: '0' });

export const attachmentsContainer = style({
  marginTop: '0.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const attachmentItemOwn = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)',
    },
  },
});

export const attachmentItemOther = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  background: vars.background.secondary,
  borderRadius: '8px',
  border: `1px solid ${vars.border.color.secondary}`,
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: vars.background.tertiary,
    },
  },
});

export const imageAttachment = style({
  maxWidth: '200px',
  maxHeight: '150px',
  width: 'auto',
  height: 'auto',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  objectFit: 'cover',
  selectors: {
    '&:hover': {
      transform: 'scale(1.02)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
});

export const fileIconOwn = style({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
});

export const fileIconOther = style({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  background: vars.colors.primary['100'],
  color: vars.colors.primary['800'],
});

export const fileInfo = style({
  flex: '1',
  minWidth: '0',
});

export const fileNameOwn = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: 'white',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const fileNameOther = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.primary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const fileSizeOwn = style({
  fontSize: '0.75rem',
  color: 'rgba(255, 255, 255, 0.9)',
});

export const fileSizeOther = style({
  fontSize: '0.75rem',
  color: vars.text.secondary,
});

export const downloadButtonOwn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  background: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
      transform: 'scale(1.05)',
    },
  },
});

export const downloadButtonOther = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  background: vars.colors.primary['500'],
  color: 'white',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  selectors: {
    '&:hover': {
      background: vars.colors.primary['600'],
      transform: 'scale(1.05)',
    },
  },
});

export const imageWrapper = style({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
});

export const imageButtonWrapper = style({
  background: 'none',
  border: 'none',
  padding: '0',
  margin: '0',
  cursor: 'pointer',
  display: 'flex',
});

// Reaction picker trigger visibility — controlled via parent hover
export const reactionPickerTrigger = style({
  opacity: '0',
});

globalStyle(`${messageBubbleWrapper}:hover .reaction-picker-trigger`, {
  opacity: '0.6',
});

globalStyle(`${messageBubbleWrapper}:hover .message-meta`, {
  opacity: '1',
});

globalStyle(`${messageBubbleWrapperOwn}:hover .reaction-picker-trigger`, {
  opacity: '0.6',
});

globalStyle(`${messageBubbleWrapperOwn}:hover .message-meta`, {
  opacity: '1',
});

globalStyle(`${messageBubbleWrapperOther}:hover .reaction-picker-trigger`, {
  opacity: '0.6',
});

globalStyle(`${messageBubbleWrapperOther}:hover .message-meta`, {
  opacity: '1',
});
