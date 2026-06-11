import { style } from '@vanilla-extract/css';

export const layout = style({
  display: 'grid',
  gridTemplateColumns: '1fr 2fr',
  gap: '16px',
  alignItems: 'start',
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const widgetRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '6px',
  background: 'var(--color-surface, #fff)',
  fontSize: '13px',
});

export const buttonRow = style({
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
});

export const columnsBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '8px',
});

export const columnsLabel = style({
  fontSize: '13px',
});

export const columnsButtons = style({
  display: 'flex',
  gap: '4px',
});

export const columnsButton = style({
  padding: '4px 10px',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: '4px',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
});

export const columnsButtonActive = style({
  background: 'var(--color-primary, #2563eb)',
  color: '#fff',
});

export const widgetsHeading = style({
  fontSize: '13px',
  margin: '8px 0',
});

export const widgetsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const widgetMeta = style({
  fontSize: '11px',
  color: '#6b7280',
});

export const widgetActions = style({
  display: 'flex',
  gap: '4px',
});

export const saveButton = style({
  marginLeft: 'auto',
});

export const emptyPreview = style({
  border: '1px dashed var(--color-border, #e5e7eb)',
  borderRadius: '8px',
  padding: '40px',
  textAlign: 'center',
  color: '#6b7280',
});
