import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChartFrame } from './ChartFrame';

describe('ChartFrame drill-down', () => {
  it('drills down from a named body control, by click or keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ChartFrame title='Adoptions' onClick={onClick}>
        <p>Chart</p>
      </ChartFrame>
    );

    const target = screen.getByRole('button', { name: 'View details for Adoptions' });
    await user.click(target);
    target.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('keeps header actions outside the drill-down control', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onExport = vi.fn();
    render(
      <ChartFrame
        title='Adoptions'
        onClick={onClick}
        actions={
          <button type='button' onClick={onExport}>
            Export
          </button>
        }
      >
        <p>Chart</p>
      </ChartFrame>
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View details for Adoptions' })).not.toContainElement(
      screen.getByRole('button', { name: 'Export' })
    );
  });

  it('is not a control at all without a drill-down handler', () => {
    render(
      <ChartFrame title='Adoptions'>
        <p>Chart</p>
      </ChartFrame>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
