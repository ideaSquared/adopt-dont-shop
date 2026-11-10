import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExportButton from './ExportButton';

const renderButton = (props: Partial<React.ComponentProps<typeof ExportButton>> = {}) => {
  const handlers = {
    onExportCSV: vi.fn().mockResolvedValue(undefined),
    onExportPDF: vi.fn().mockResolvedValue(undefined),
    onEmailReport: vi.fn().mockResolvedValue(undefined),
  };
  render(<ExportButton {...handlers} {...props} />);
  return handlers;
};

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

describe('ExportButton', () => {
  it('offers the three report actions in a menu', () => {
    renderButton();
    openMenu();

    expect(screen.getByRole('menuitem', { name: 'Export as CSV' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Export as PDF' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Email Report' })).toBeInTheDocument();
  });

  it.each([
    ['Export as CSV', 'onExportCSV'],
    ['Export as PDF', 'onExportPDF'],
    ['Email Report', 'onEmailReport'],
  ] as const)('runs %s', async (label, handlerName) => {
    const handlers = renderButton();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: label }));

    await waitFor(() => expect(handlers[handlerName]).toHaveBeenCalledTimes(1));
  });

  it('is disabled while an export is running', async () => {
    let finish: () => void = () => undefined;
    renderButton({ onExportCSV: () => new Promise<void>(resolve => (finish = resolve)) });
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Export as CSV' }));

    expect(await screen.findByRole('button', { name: 'Exporting...' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Export Report' })).toBeEnabled();
  });

  it('cannot be opened when disabled', () => {
    renderButton({ disabled: true });
    expect(screen.getByRole('button', { name: 'Export Report' })).toBeDisabled();
  });
});
