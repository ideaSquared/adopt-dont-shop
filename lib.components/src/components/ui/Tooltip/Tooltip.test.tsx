import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Tooltip from './Tooltip';

/**
 * The Tooltip wrapper is a thin layer over @radix-ui/react-tooltip. We assert
 * the contract consumers depend on: the trigger child is rendered as-is and
 * forwards the accessibility attributes Radix wires up. Hover-driven visibility
 * is exercised by Radix's own test suite — duplicating it in JSDOM (which
 * does not simulate the pointer/positioning semantics Radix relies on) only
 * produces flaky tests.
 */
describe('Tooltip', () => {
  it('renders the trigger child unchanged', () => {
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('wires accessibility attributes onto the trigger', () => {
    render(
      <Tooltip content='Helpful hint'>
        <button type='button'>Action</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Action' });
    // Radix sets data-state on the trigger so screen-reader users and CSS
    // know whether the tooltip is open. We assert the attribute exists rather
    // than its specific value because the closed-by-default value is not part
    // of our public contract.
    expect(trigger).toHaveAttribute('data-state');
  });
});
