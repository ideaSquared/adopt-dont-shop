import { style } from '@vanilla-extract/css';

export const container = style({
  maxWidth: 1200,
  margin: '0 auto',
  padding: '2rem',
});

export const hero = style({
  textAlign: 'center',
  padding: '4rem 0',
});

export const title = style({
  fontSize: '3rem',
  color: '#333',
  marginBottom: '1rem',
});

export const subtitle = style({
  fontSize: '1.2rem',
  color: '#666',
  marginBottom: '2rem',
});

export const featuresGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '2rem',
  marginTop: '3rem',
});

export const featureCard = style({
  background: 'white',
  padding: '2rem',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  textAlign: 'center',
});

export const featureIcon = style({
  fontSize: '2rem',
  marginBottom: '1rem',
});

export const featureTitle = style({
  color: '#333',
  marginBottom: '1rem',
});

export const featureDescription = style({
  color: '#666',
  fontSize: '0.9rem',
});

export const templateInfo = style({
  background: '#f8f9fa',
  padding: '1.5rem',
  borderRadius: 8,
  margin: '2rem 0',
  textAlign: 'center',
});
