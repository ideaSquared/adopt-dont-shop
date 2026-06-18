/**
 * Behaviour tests for ApplicationDetails module.
 *
 * Tests verify that applicant data is rendered correctly from the
 * getData/getStr/getArr accessor pattern, matching production behaviour.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApplicationDetails } from './ApplicationDetails';

vi.mock('../ApplicationReview.css', () => {
  const names = [
    'card',
    'cardTitle',
    'field',
    'fieldLabel',
    'fieldValue',
    'fieldValueFullWidth',
    'fieldVertical',
    'grid',
    'section',
    'sectionTitle',
  ] as const;
  const out: Record<string, unknown> = {};
  for (const name of names) {
    out[name] = name;
  }
  return out;
});

type DataStore = Record<string, unknown>;

const makeAccessors = (data: DataStore) => {
  const getData = (path: string): unknown => {
    const keys = path.split('.');
    let current: unknown = data;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  };
  const getStr = (path: string): string => (getData(path) as string | null | undefined) ?? '';
  const getArr = (path: string): unknown[] => {
    const val = getData(path);
    return Array.isArray(val) ? val : [];
  };
  return { getData, getStr, getArr };
};

describe('ApplicationDetails — personal information', () => {
  it('renders the applicant first name and last name', () => {
    const accessors = makeAccessors({
      personalInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    });
    render(<ApplicationDetails {...accessors} />);
    expect(screen.getByText(/Jane/)).toBeInTheDocument();
    expect(screen.getByText(/Doe/)).toBeInTheDocument();
  });

  it('shows N/A when email is missing', () => {
    const accessors = makeAccessors({ personalInfo: { firstName: 'Jane', lastName: 'Doe' } });
    render(<ApplicationDetails {...accessors} />);
    // Email label is present and value falls back to N/A
    expect(screen.getByText('Email')).toBeInTheDocument();
    const values = screen.getAllByText('N/A');
    expect(values.length).toBeGreaterThan(0);
  });
});

describe('ApplicationDetails — previous pets section', () => {
  it('does not render the previous pets section when the array is empty', () => {
    const accessors = makeAccessors({ answers: { previous_pets: [] } });
    render(<ApplicationDetails {...accessors} />);
    expect(screen.queryByText(/previous pet experience/i)).toBeNull();
  });

  it('renders previous pet entries when present', () => {
    const accessors = makeAccessors({
      answers: {
        previous_pets: [{ type: 'dog', breed: 'Labrador', years_owned: '3', what_happened: 'Passed away' }],
      },
    });
    render(<ApplicationDetails {...accessors} />);
    expect(screen.getByText(/previous pet experience/i)).toBeInTheDocument();
    expect(screen.getByText('Labrador')).toBeInTheDocument();
    expect(screen.getByText('Passed away')).toBeInTheDocument();
  });
});
