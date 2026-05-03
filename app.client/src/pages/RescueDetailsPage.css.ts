import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const backButton = style({
  marginBottom: '2rem',
});

export const rescueHeader = style({
  background: '#f9fafb',
  borderRadius: '16px',
  padding: '3rem',
  marginBottom: '3rem',
  textAlign: 'center',
});

globalStyle(`${rescueHeader} h1`, {
  fontSize: '3rem',
  fontWeight: '700',
  marginBottom: '1rem',
  color: '#111827',
});

globalStyle(`${rescueHeader} .rescue-meta`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
  marginBottom: '1.5rem',
});

globalStyle(`${rescueHeader} .rescue-meta .meta-item`, {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.1rem',
  color: '#6b7280',
});

globalStyle(`${rescueHeader} .rescue-meta .meta-item .icon`, {
  width: '20px',
  height: '20px',
  fill: 'currentColor',
});

globalStyle(`${rescueHeader} .verification-badge`, {
  marginBottom: '1rem',
});

globalStyle(`${rescueHeader} .contact-info`, {
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
});

export const rescueInfo = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '2rem',
  marginBottom: '3rem',
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: '2fr 1fr',
    },
  },
});

export const descriptionCard = style({
  padding: '2rem',
});

globalStyle(`${descriptionCard} h2`, {
  fontSize: '1.5rem',
  fontWeight: '600',
  marginBottom: '1.5rem',
  color: '#111827',
});

globalStyle(`${descriptionCard} h3`, {
  fontSize: '1.2rem',
  fontWeight: '600',
  margin: '2rem 0 1rem 0',
  color: '#111827',
});

globalStyle(`${descriptionCard} p`, {
  lineHeight: '1.6',
  color: '#6b7280',
  whiteSpace: 'pre-wrap',
});

export const contactCard = style({
  padding: '2rem',
});

globalStyle(`${contactCard} h2`, {
  fontSize: '1.5rem',
  fontWeight: '600',
  marginBottom: '1.5rem',
  color: '#111827',
});

globalStyle(`${contactCard} .contact-item`, {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1rem',
  padding: '1rem',
  background: '#ffffff',
  borderRadius: '8px',
});

globalStyle(`${contactCard} .contact-item .icon`, {
  width: '20px',
  height: '20px',
  fill: '#6b7280',
  flexShrink: 0,
});

globalStyle(`${contactCard} .contact-item .details .label`, {
  fontWeight: '500',
  color: '#6b7280',
  fontSize: '0.9rem',
});

globalStyle(`${contactCard} .contact-item .details .value`, {
  color: '#111827',
  fontWeight: '600',
});

globalStyle(`${contactCard} .website-link`, {
  color: '#2563eb',
  textDecoration: 'none',
});

globalStyle(`${contactCard} .website-link:hover`, {
  color: '#1d4ed8',
  textDecoration: 'underline',
});

export const petsSection = style({});

globalStyle(`${petsSection} h2`, {
  fontSize: '2rem',
  fontWeight: '600',
  marginBottom: '2rem',
  color: '#111827',
  textAlign: 'center',
});

globalStyle(`${petsSection} .pets-header`, {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
  flexWrap: 'wrap',
  gap: '1rem',
});

globalStyle(`${petsSection} .pets-header .pets-count`, {
  fontSize: '1.1rem',
  color: '#6b7280',
});

globalStyle(`${petsSection} .pets-header .view-toggle`, {
  display: 'flex',
  gap: '0.5rem',
});

export const petsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '1.5rem',
});

export const loadMoreButton = style({
  margin: '2rem auto',
  display: 'block',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
  fontSize: '1.1rem',
  color: '#6b7280',
});

export const errorContainer = style({
  textAlign: 'center',
  padding: '3rem',
  color: '#ef4444',
});

globalStyle(`${errorContainer} h2`, {
  fontSize: '1.5rem',
  marginBottom: '1rem',
});

globalStyle(`${errorContainer} p`, {
  marginBottom: '2rem',
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem',
  color: '#6b7280',
});

globalStyle(`${emptyState} .icon`, {
  width: '64px',
  height: '64px',
  margin: '0 auto 1rem',
  fill: 'currentColor',
  opacity: '0.5',
});

globalStyle(`${emptyState} h3`, {
  fontSize: '1.5rem',
  marginBottom: '1rem',
  color: '#111827',
});

globalStyle(`${emptyState} p`, {
  fontSize: '1.1rem',
  marginBottom: '2rem',
});
