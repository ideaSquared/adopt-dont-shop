import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdoptionTrendsChart from './AdoptionTrendsChart';

describe('AdoptionTrendsChart', () => {
  it('labels each point with a day-first date', () => {
    const { container } = render(
      <AdoptionTrendsChart
        data={[
          { date: '2026-06-01', count: 2 },
          { date: '2026-06-15', count: 5 },
        ]}
      />
    );

    const labels = Array.from(container.querySelectorAll('text')).map(node => node.textContent);
    expect(labels).toContain('1 Jun');
    expect(labels).toContain('15 Jun');
  });

  it('shows an empty state when there is no data', () => {
    render(<AdoptionTrendsChart data={[]} />);
    expect(screen.getByText('No trend data available')).toBeInTheDocument();
  });
});
