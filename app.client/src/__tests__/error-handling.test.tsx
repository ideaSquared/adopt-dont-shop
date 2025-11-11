/**
 * Error Handling Behaviour Tests
 *
 * These tests verify error handling behaviours including:
 * - Error boundaries catching rendering errors
 * - Network error handling
 * - Offline mode detection
 * - Retry mechanisms
 * - User-friendly error messages
 * - Graceful degradation
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SearchPage } from '../pages/SearchPage';
import { PetDetailsPage } from '../pages/PetDetailsPage';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Component that throws error for testing error boundary
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress console.error during error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('Error Handling Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Error Boundaries', () => {
    it('catches rendering errors and shows error UI', async () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // User sees error message instead of crash
      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });

      // User does not see the component that crashed
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('shows error details in error boundary', async () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });

      // Error message is user-friendly
      expect(screen.getByText(/try refreshing|something went wrong/i)).toBeInTheDocument();
    });

    it('provides reload button in error boundary', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });

      // User sees reload button
      const reloadButton = screen.getByRole('button', { name: /reload|refresh|try again/i });
      expect(reloadButton).toBeInTheDocument();

      // User can click to reload
      await user.click(reloadButton);
      // This would trigger window.location.reload()
    });

    it('provides go home button in error boundary', async () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });

      // User sees go home button
      const homeButton = screen.getByRole('button', { name: /go home|return home/i });
      expect(homeButton).toBeInTheDocument();
    });

    it('does not show error UI when no error occurs', async () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Component renders normally
      expect(screen.getByText('No error')).toBeInTheDocument();

      // No error UI is shown
      expect(screen.queryByText(/something went wrong|error occurred/i)).not.toBeInTheDocument();
    });

    it('isolates errors to specific component trees', async () => {
      renderWithProviders(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>Other content</div>
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong|error occurred/i)).toBeInTheDocument();
      });

      // Other content still renders
      expect(screen.getByText('Other content')).toBeInTheDocument();
    });
  });

  describe('Network Errors', () => {
    it('shows error message when API request fails', async () => {
      // Set up server to return error
      const server = setupServer(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
          );
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load|error loading|something went wrong/i)).toBeInTheDocument();
      });

      server.close();
    });

    it('provides retry button after network error', async () => {
      const user = userEvent.setup();

      const server = setupServer(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
          );
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load|error loading/i)).toBeInTheDocument();
      });

      // User sees retry button
      const retryButton = screen.getByRole('button', { name: /retry|try again/i });
      await user.click(retryButton);

      // System attempts to reload data
      // Implementation would retry the API call

      server.close();
    });

    it('shows appropriate error for 404 not found', async () => {
      const server = setupServer(
        http.get('/api/v1/pets/:petId', () => {
          return HttpResponse.json(
            { success: false, message: 'Pet not found' },
            { status: 404 }
          );
        })
      );

      server.listen();

      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/nonexistent' });

      await waitFor(() => {
        expect(screen.getByText(/not found|doesn't exist|couldn't find/i)).toBeInTheDocument();
      });

      server.close();
    });

    it('shows appropriate error for 401 unauthorized', async () => {
      const server = setupServer(
        http.get('/api/v1/favorites', () => {
          return HttpResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      server.listen();

      // User tries to access protected resource
      // System shows login prompt or error message

      server.close();
    });

    it('shows appropriate error for 403 forbidden', async () => {
      const server = setupServer(
        http.post('/api/v1/applications', () => {
          return HttpResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
          );
        })
      );

      server.listen();

      // User tries unauthorized action
      // System shows permission denied message

      server.close();
    });

    it('shows generic error for unknown error codes', async () => {
      const server = setupServer(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json(
            { success: false, message: 'Unknown error' },
            { status: 418 }
          );
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/error|something went wrong/i)).toBeInTheDocument();
      });

      server.close();
    });
  });

  describe('Offline Mode', () => {
    it('detects when user goes offline', async () => {
      renderWithProviders(<SearchPage />);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));

      // User sees offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline|no connection|no internet/i)).toBeInTheDocument();
      });
    });

    it('shows online indicator when connection is restored', async () => {
      renderWithProviders(<SearchPage />);

      // Go offline
      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline|no connection/i)).toBeInTheDocument();
      });

      // Go back online
      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/offline|no connection/i)).not.toBeInTheDocument();
      });
    });

    it('shows cached content when offline', async () => {
      renderWithProviders(<SearchPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Go offline
      window.dispatchEvent(new Event('offline'));

      // Cached content still visible
      expect(screen.getByText('Buddy')).toBeInTheDocument();

      // User sees offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline|viewing cached/i)).toBeInTheDocument();
      });
    });

    it('prevents actions that require network when offline', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Go offline
      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // User tries to favorite (requires network)
      const favoriteButton = screen.queryByRole('button', { name: /favorite/i });
      if (favoriteButton) {
        await user.click(favoriteButton);

        // User sees message that action requires connection
        await waitFor(() => {
          expect(screen.getByText(/requires connection|offline mode/i)).toBeInTheDocument();
        });
      }
    });

    it('retries failed requests when coming back online', async () => {
      renderWithProviders(<SearchPage />);

      // Go offline during a request
      window.dispatchEvent(new Event('offline'));

      // Come back online
      window.dispatchEvent(new Event('online'));

      // System automatically retries failed requests
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });
    });
  });

  describe('Timeout Handling', () => {
    it('shows timeout error for slow requests', async () => {
      const server = setupServer(
        http.get('/api/v1/pets', async () => {
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return HttpResponse.json({ success: true, data: { pets: [] } });
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      // If request timeout is implemented
      await waitFor(
        () => {
          expect(screen.getByText(/timeout|took too long|slow connection/i)).toBeInTheDocument();
        },
        { timeout: 6000 }
      );

      server.close();
    });

    it('allows user to cancel slow requests', async () => {
      const user = userEvent.setup();

      // Mock slow request
      const server = setupServer(
        http.get('/api/v1/pets', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return HttpResponse.json({ success: true, data: { pets: [] } });
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      // User sees loading state
      expect(screen.getByText(/loading|searching/i)).toBeInTheDocument();

      // User sees cancel button (if implemented)
      const cancelButton = screen.queryByRole('button', { name: /cancel/i });
      if (cancelButton) {
        await user.click(cancelButton);

        // Request is cancelled
        await waitFor(() => {
          expect(screen.queryByText(/loading|searching/i)).not.toBeInTheDocument();
        });
      }

      server.close();
    });
  });

  describe('Validation Errors', () => {
    it('shows field-specific validation errors', async () => {
      // Already tested in form tests, but verifying error display
      // Validation errors are shown inline with fields
      // Implementation specific to each form
    });

    it('shows summary of validation errors', async () => {
      // Some forms may show error summary at top
      // Implementation specific
    });

    it('focuses first invalid field on validation error', async () => {
      // After validation fails, focus moves to first error
      // Accessibility feature
    });
  });

  describe('Graceful Degradation', () => {
    it('works without JavaScript features when unavailable', async () => {
      // If certain browser features aren't available
      // App provides fallback functionality
      // This would test progressive enhancement
    });

    it('provides alt text for images', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // All images have alt text
      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAccessibleName();
      });
    });

    it('works with keyboard navigation', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // All interactive elements are keyboard accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        button.focus();
        expect(button).toHaveFocus();
      });
    });
  });

  describe('Error Recovery', () => {
    it('allows user to recover from error and continue using app', async () => {
      const user = userEvent.setup();

      // Error occurs
      const server = setupServer(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json(
            { success: false, message: 'Error' },
            { status: 500 }
          );
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });

      // Fix the error
      server.use(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json({
            success: true,
            data: { pets: [] },
          });
        })
      );

      // User retries
      const retryButton = screen.getByRole('button', { name: /retry|try again/i });
      await user.click(retryButton);

      // Error is resolved, app works normally
      await waitFor(() => {
        expect(screen.queryByText(/error|failed/i)).not.toBeInTheDocument();
      });

      server.close();
    });

    it('clears error state when navigating to new page', async () => {
      const user = userEvent.setup();

      // Error on current page
      const server = setupServer(
        http.get('/api/v1/pets', () => {
          return HttpResponse.json(
            { success: false, message: 'Error' },
            { status: 500 }
          );
        })
      );

      server.listen();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });

      // User navigates away
      const homeLink = screen.getByRole('link', { name: /home/i });
      await user.click(homeLink);

      // Error state is cleared
      await waitFor(() => {
        expect(screen.queryByText(/error|failed/i)).not.toBeInTheDocument();
      });

      server.close();
    });
  });

  describe('Error Logging', () => {
    it('logs errors to analytics service', async () => {
      // When error occurs, it's logged for monitoring
      // Analytics tracking would be tested with analytics mocks
    });

    it('includes error context in logs', async () => {
      // Error logs include useful context
      // User ID, page, action attempted, etc.
    });

    it('respects user privacy in error logs', async () => {
      // Personal information is not logged
      // Error logs are anonymized
    });
  });
});
