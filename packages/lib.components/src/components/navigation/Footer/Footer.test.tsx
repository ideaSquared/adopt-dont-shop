import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Footer } from './Footer';
import { SourceCodeLink, SOURCE_CODE_URL } from './SourceCodeLink';

describe('Footer source code link (AGPL-3.0 section 13)', () => {
  it('links to the public repository from the shared footer', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Source code' });
    expect(link).toHaveAttribute('href', 'https://github.com/ideaSquared/adopt-dont-shop');
  });

  it('opens the repository safely in a new tab when used standalone', () => {
    render(<SourceCodeLink />);

    const link = screen.getByRole('link', { name: 'Source code' });
    expect(link).toHaveAttribute('href', SOURCE_CODE_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
