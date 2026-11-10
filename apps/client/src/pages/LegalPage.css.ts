import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

// The legal documents are rendered markdown, so their links arrive unstyled.
export const legalContent = style({});

globalStyle(`${legalContent} a`, {
  color: vars.text.link,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  overflowWrap: 'anywhere',
});

globalStyle(`${legalContent} a:hover`, {
  color: vars.text.linkHover,
});

globalStyle(`${legalContent} a:focus-visible`, {
  outline: `2px solid ${vars.colors.primary}`,
  outlineOffset: '2px',
  borderRadius: vars.border.radius.sm,
});
