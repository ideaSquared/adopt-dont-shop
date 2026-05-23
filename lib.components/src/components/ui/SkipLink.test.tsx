import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders an anchor pointing to the main content region by default', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('respects a custom href and label', () => {
    render(<SkipLink href='#search-results'>Skip to results</SkipLink>);
    const link = screen.getByRole('link', { name: /skip to results/i });
    expect(link).toHaveAttribute('href', '#search-results');
  });

  it('declares a visually-hidden base style that reveals on :focus', () => {
    // jsdom does not run CSS so we assert the styling intent via the source.
    const source = readFileSync(path.resolve(__dirname, './SkipLink.css.ts'), 'utf8');

    // Off-screen by default.
    expect(source).toMatch(/left:\s*['"]-9999px['"]/);
    // Revealed inside the viewport when focused.
    expect(source).toMatch(/'&:focus':\s*\{[\s\S]*left:\s*['"]0\.75rem['"]/);
  });
});
