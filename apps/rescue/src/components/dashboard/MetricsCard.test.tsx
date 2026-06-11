import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MetricsCard from './MetricsCard';

describe('MetricsCard', () => {
  it('renders the title, value and icon', () => {
    render(<MetricsCard title="Total adoptions" value={42} icon="🐶" />);
    expect(screen.getByText('Total adoptions')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('🐶')).toBeInTheDocument();
  });

  it('renders a positive trend with an up arrow', () => {
    render(
      <MetricsCard title="Apps" value="10" icon="📈" trend={{ value: 12, isPositive: true }} />
    );
    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText('12% from last month')).toBeInTheDocument();
    expect(document.querySelector('.metrics-trend')).toHaveClass('positive');
  });

  it('renders a negative trend with a down arrow', () => {
    render(
      <MetricsCard title="Apps" value="10" icon="📉" trend={{ value: 5, isPositive: false }} />
    );
    expect(screen.getByText('↓')).toBeInTheDocument();
    expect(screen.getByText('5% from last month')).toBeInTheDocument();
    expect(document.querySelector('.metrics-trend')).toHaveClass('negative');
  });

  it('omits the trend block when no trend prop is passed', () => {
    render(<MetricsCard title="Apps" value="10" icon="📊" />);
    expect(document.querySelector('.metrics-trend')).toBeNull();
  });
});
