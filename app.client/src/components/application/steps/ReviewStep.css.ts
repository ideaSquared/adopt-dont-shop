import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const stepContainer = style({
  maxWidth: '600px',
});

export const subSectionLabel = style({
  display: 'block',
  marginTop: '1rem',
  marginBottom: '0.5rem',
});

export const subSectionLabelBold = style({
  display: 'block',
  marginBottom: '0.5rem',
  fontWeight: 'bold',
});

export const subSectionLabelBoldSpaced = style({
  display: 'block',
  marginTop: '1rem',
  marginBottom: '0.5rem',
  fontWeight: 'bold',
});

export const referenceItem = style({
  marginBottom: '1rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid #eee',
});

export const noteText = style({
  fontStyle: 'italic',
  color: '#666',
});

export const submitNote = style({
  marginTop: '1rem',
  fontSize: '0.9rem',
  color: '#666',
});

export const stepTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  marginBottom: '0.5rem',
});

export const stepDescription = style({
  color: vars.text.secondary,
  marginBottom: '2rem',
});

export const form = style({
  display: 'grid',
  gap: '1.5rem',
});

export const reviewSection = style({
  padding: '1.5rem',
  background: vars.background.secondary,
  borderRadius: '8px',
  marginBottom: '1rem',
});

export const sectionTitle = style({
  fontSize: '1.1rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

export const reviewItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  '@media': {
    '(min-width: 768px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '1rem',
    },
  },
});

export const reviewLabel = style({
  fontWeight: 500,
  color: vars.text.secondary,
  flexShrink: 0,
  '@media': {
    '(min-width: 768px)': {
      minWidth: '200px',
      maxWidth: '200px',
    },
  },
});

export const reviewValue = style({
  color: vars.text.primary,
  wordWrap: 'break-word',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.4,
  '@media': {
    '(min-width: 768px)': {
      flex: 1,
      textAlign: 'right',
    },
  },
});

export const longTextReviewItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const longTextValue = style({
  color: vars.text.primary,
  wordWrap: 'break-word',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
  padding: '0.75rem',
  background: vars.background.primary,
  borderRadius: '4px',
  border: `1px solid ${vars.border.color.primary}`,
});
