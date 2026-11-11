import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

const DESKTOP = 'screen and (min-width: 1024px)';

export const page = style({
  paddingTop: vars.spacing['5'],
  paddingBottom: vars.spacing['7'],
  selectors: {
    // Focused programmatically after navigating between documents; not a control.
    '&:focus': { outline: 'none' },
  },
});

export const meta = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${vars.spacing['1']} ${vars.spacing['3']}`,
});

export const documentNav = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['2'],
  marginTop: vars.spacing['3'],
  marginBottom: vars.spacing['5'],
});

export const documentNavLink = style({
  padding: `${vars.spacing['1']} ${vars.spacing['3']}`,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.pill,
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      color: vars.text.primary,
      borderColor: vars.border.color.strong,
    },
    '&[aria-current="page"]': {
      background: vars.text.primary,
      borderColor: vars.text.primary,
      color: vars.background.body,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: vars.spacing['5'],
  '@media': {
    [DESKTOP]: {
      gridTemplateColumns: '260px minmax(0, 1fr)',
      gap: vars.spacing['7'],
      alignItems: 'start',
    },
  },
});

export const toc = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['3'],
  '@media': {
    [DESKTOP]: {
      position: 'sticky',
      top: vars.spacing['5'],
      maxHeight: `calc(100vh - ${vars.spacing['7']})`,
      overflowY: 'auto',
    },
  },
});

export const tocSummary = style({
  cursor: 'pointer',
  color: vars.text.primary,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const tocList = style({
  listStyle: 'none',
  margin: `${vars.spacing['3']} 0 0`,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const tocLink = style({
  display: 'block',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.base,
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.snug,
  textDecoration: 'none',
  selectors: {
    '&:hover': {
      background: vars.background.muted,
      color: vars.text.primary,
    },
    '&:focus-visible': {
      outline: `2px solid ${vars.border.color.focus}`,
      outlineOffset: '2px',
    },
  },
});

export const article = style({
  minWidth: 0,
  maxWidth: '75ch',
  color: vars.text.primary,
  fontSize: vars.typography.size.base,
  lineHeight: vars.typography.lineHeight.relaxed,
  selectors: {
    // With no section index the article is alone in the grid; don't park it in the sidebar column.
    '&:only-child': { gridColumn: '1 / -1' },
  },
});

// The legal text arrives as sanitized HTML from markdown, so its elements are
// styled by descendant selector rather than by class.
globalStyle(`${article} h2`, {
  margin: `${vars.spacing['7']} 0 ${vars.spacing['3']}`,
  paddingTop: vars.spacing['4'],
  borderTop: `1px solid ${vars.border.color.default}`,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  lineHeight: vars.typography.lineHeight.snug,
  scrollMarginTop: vars.spacing['5'],
});

// A document that opens straight into its first section needs no divider or gap above it.
globalStyle(`${article} h2:first-child`, {
  marginTop: 0,
  paddingTop: 0,
  borderTop: 'none',
});

globalStyle(`${article} h3`, {
  margin: `${vars.spacing['5']} 0 ${vars.spacing['2']}`,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  scrollMarginTop: vars.spacing['5'],
});

globalStyle(`${article} p`, { margin: `0 0 ${vars.spacing['3']}` });

globalStyle(`${article} ul, ${article} ol`, {
  margin: `0 0 ${vars.spacing['3']}`,
  paddingLeft: vars.spacing['5'],
});

globalStyle(`${article} li`, { marginBottom: vars.spacing['2'] });

globalStyle(`${article} a`, {
  color: vars.text.link,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  overflowWrap: 'anywhere',
});

globalStyle(`${article} a:hover`, { color: vars.text.linkHover });

globalStyle(`${article} code`, {
  padding: '0.1em 0.35em',
  background: vars.background.muted,
  borderRadius: vars.border.radius.sm,
  fontFamily: vars.typography.family.mono,
  fontSize: '0.9em',
  overflowWrap: 'anywhere',
});

globalStyle(`${article} blockquote`, {
  margin: `0 0 ${vars.spacing['3']}`,
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: vars.background.muted,
  borderLeft: `3px solid ${vars.border.color.strong}`,
  borderRadius: vars.border.radius.base,
});

globalStyle(`${article} [data-legal-table]`, {
  margin: `0 0 ${vars.spacing['4']}`,
  overflowX: 'auto',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
});

globalStyle(`${article} table`, {
  width: '100%',
  minWidth: '560px',
  borderCollapse: 'collapse',
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.normal,
});

globalStyle(`${article} th, ${article} td`, {
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  textAlign: 'left',
  verticalAlign: 'top',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${article} th`, {
  background: vars.background.muted,
  fontWeight: vars.typography.weight.semibold,
  whiteSpace: 'nowrap',
});

globalStyle(`${article} tr:last-child td`, { borderBottom: 'none' });
