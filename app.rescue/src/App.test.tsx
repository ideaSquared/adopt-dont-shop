import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

/**
 * App-level smoke test for ADS-497 wiring: confirms the legal re-acceptance
 * modal is mounted in the rescue App. The modal's own behaviour
 * (auth/pending/error states) is covered by tests in lib.legal — here we
 * only verify wire-up in this app.
 */

vi.mock('@adopt-dont-shop/lib.legal', () => ({
  LegalReacceptanceModal: () => <div data-testid="legal-reacceptance-modal-sentinel" />,
}));

vi.mock('@adopt-dont-shop/lib.analytics', () => ({
  useAnalyticsInvalidator: vi.fn(),
}));

vi.mock('./components/ProtectedRoute', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./components/shared/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('./components/dev/DevLoginPanel', () => ({
  default: () => null,
}));
vi.mock('./components/ErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import App from './App';

describe('rescue App [ADS-497 modal wiring]', () => {
  it('mounts the LegalReacceptanceModal at the App root', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('legal-reacceptance-modal-sentinel')).toBeInTheDocument();
  });
});
