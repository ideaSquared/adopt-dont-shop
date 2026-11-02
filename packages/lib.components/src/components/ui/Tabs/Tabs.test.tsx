import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { Tabs, type TabItem } from './Tabs';

const ITEMS: ReadonlyArray<TabItem> = [
  { id: 'one', label: 'One', content: <input aria-label='first field' /> },
  { id: 'two', label: 'Two', content: <p>Second panel</p> },
  { id: 'three', label: 'Three', content: <p>Third panel</p> },
];

const Harness = ({ onChange }: { onChange?: (id: string) => void }) => {
  const [value, setValue] = useState('one');
  return (
    <Tabs
      tabs={ITEMS}
      value={value}
      onChange={id => {
        onChange?.(id);
        setValue(id);
      }}
      aria-label='Sections'
    />
  );
};

describe('Tabs', () => {
  it('renders a labelled tablist with tabs linked to their panels', () => {
    render(<Harness />);

    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['One', 'Two', 'Three']);

    const activePanel = screen.getByRole('tabpanel', { name: 'One' });
    expect(tabs[0]).toHaveAttribute('aria-controls', activePanel.id);
    expect(activePanel).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(new Set(tabs.map(t => t.id)).size).toBe(3);
  });

  it('marks only the active tab selected and tabbable', () => {
    render(<Harness />);

    const [one, two, three] = screen.getAllByRole('tab');
    expect(one).toHaveAttribute('aria-selected', 'true');
    expect(two).toHaveAttribute('aria-selected', 'false');
    expect(one).toHaveAttribute('tabindex', '0');
    expect(two).toHaveAttribute('tabindex', '-1');
    expect(three).toHaveAttribute('tabindex', '-1');
  });

  it('keeps inactive panels mounted but hidden', () => {
    render(<Harness />);

    expect(screen.getByRole('tabpanel', { name: 'One' })).toBeVisible();
    expect(screen.getByText('Second panel')).toBeInTheDocument();
    expect(screen.getByText('Second panel')).not.toBeVisible();
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
  });

  it('keeps form state in a panel while another tab is shown', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('first field'), 'draft');
    await user.click(screen.getByRole('tab', { name: 'Two' }));
    await user.click(screen.getByRole('tab', { name: 'One' }));

    expect(screen.getByLabelText('first field')).toHaveValue('draft');
  });

  it('selects a tab on click and reports its id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole('tab', { name: 'Two' }));

    expect(onChange).toHaveBeenCalledWith('two');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Second panel')).toBeVisible();
  });

  it('moves focus and selection with ArrowRight and wraps from last to first', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('two');

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'One' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('one');
  });

  it('moves focus and selection with ArrowLeft and wraps from first to last', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('three');
  });

  it('jumps to the last tab on End and the first on Home', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    screen.getByRole('tab', { name: 'One' }).focus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('three');

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'One' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('one');
  });

  it('makes only the active panel focusable', () => {
    render(<Harness />);

    expect(screen.getByRole('tabpanel', { name: 'One' })).toHaveAttribute('tabindex', '0');
    const inactive = screen.getAllByRole('tabpanel', { hidden: true }).filter(p => p.hidden);
    expect(inactive).toHaveLength(2);
    inactive.forEach(panel => expect(panel).not.toHaveAttribute('tabindex'));
  });
});
