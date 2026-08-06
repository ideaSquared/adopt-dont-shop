import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders the label and the value', () => {
    render(<MetricCard label='Total users' value={1234} />);

    expect(screen.getByText('Total users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders string values verbatim', () => {
    render(<MetricCard label='Status' value='Healthy' />);

    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('formats a numeric value as a percentage', () => {
    render(<MetricCard label='Adoption rate' value={0.163} format='percent' />);

    expect(screen.getByText('16.3%')).toBeInTheDocument();
  });

  it('formats a numeric value as currency', () => {
    render(<MetricCard label='Donations' value={48200} format='currency' />);

    expect(screen.getByText('£48,200')).toBeInTheDocument();
  });

  it('renders a positive delta with a leading plus sign', () => {
    render(<MetricCard label='Signups' value={100} delta={0.052} />);

    expect(screen.getByText('+5.2%')).toBeInTheDocument();
  });

  it('renders a negative delta with its sign', () => {
    render(<MetricCard label='Signups' value={100} delta={-0.052} />);

    expect(screen.getByText('-5.2%')).toBeInTheDocument();
  });

  it('renders helper text when provided', () => {
    render(<MetricCard label='Active rescues' value={74} helperText='90 total' />);

    expect(screen.getByText('90 total')).toBeInTheDocument();
  });

  it('renders an icon when one is provided', () => {
    render(
      <MetricCard label='Total users' value={5} icon={<span data-testid='the-icon'>★</span>} />
    );

    expect(screen.getByTestId('metric-card-icon')).toBeInTheDocument();
    expect(screen.getByTestId('the-icon')).toBeInTheDocument();
  });

  it('renders no icon when none is provided', () => {
    render(<MetricCard label='Total users' value={5} />);

    expect(screen.queryByTestId('metric-card-icon')).not.toBeInTheDocument();
  });

  it('renders a skeleton instead of the value when loading', () => {
    render(<MetricCard label='Total users' value={1234} loading />);

    expect(screen.getByTestId('metric-card-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
  });

  it('hides delta and helper text while loading', () => {
    render(<MetricCard label='Signups' value={100} delta={0.052} helperText='90 total' loading />);

    expect(screen.queryByText('+5.2%')).not.toBeInTheDocument();
    expect(screen.queryByText('90 total')).not.toBeInTheDocument();
  });
});
