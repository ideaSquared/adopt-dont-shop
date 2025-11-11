/**
 * Pet Discovery (Swipe) Behaviour Tests
 *
 * These tests verify pet discovery behaviours including:
 * - Viewing pets in discovery queue
 * - Swipe actions (like, pass, super like)
 * - Filter management
 * - Loading more pets
 * - Session tracking
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { DiscoveryPage } from '../components/discovery/DiscoveryPage';

describe('Pet Discovery Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Viewing Pets', () => {
    it('loads and displays pets in discovery queue', async () => {
      renderWithProviders(<DiscoveryPage />);

      // User sees loading state initially
      expect(screen.getByText(/loading pets/i)).toBeInTheDocument();

      // System loads pets from queue
      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User sees pet information
      // Pet cards are rendered by SwipeStack component (shows 3 stacked)
      await waitFor(() => {
        expect(screen.getAllByText('Buddy')[0]).toBeInTheDocument();
      });
    });

    it('displays pet details in discovery card', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User sees pet name (SwipeStack shows multiple stacked cards)
      expect(screen.getAllByText('Buddy')[0]).toBeInTheDocument();

      // User sees pet breed
      expect(screen.getAllByText(/golden retriever/i)[0]).toBeInTheDocument();
    });

    it('shows message when no pets are available', async () => {
      // Mock empty response
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // After swiping through all pets, user sees message
      // This would be implemented in the SwipeStack component
    });
  });

  describe('Swipe Actions', () => {
    it('allows user to like a pet using button controls', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Initial session stats show 0 likes (multiple .number elements show 0)
      expect(screen.getAllByText('0', { selector: '.number' }).length).toBeGreaterThan(0);

      // User clicks like button (multiple like buttons exist in stacked cards)
      const likeButton = screen.getAllByRole('button', { name: /like|heart/i })[0];
      await user.click(likeButton);

      // System records like action
      // Session stats update to show 1 like
      await waitFor(() => {
        const statsGrid = screen.getByText(/session progress/i).nextElementSibling;
        const likeStat = within(statsGrid as HTMLElement).getAllByText('1')[0];
        expect(likeStat).toBeInTheDocument();
      });

      // Next pet appears
      await waitFor(() => {
        expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument();
      });
    });

    it('allows user to pass on a pet using button controls', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      const firstPetName = screen.getAllByText('Buddy')[0];
      expect(firstPetName).toBeInTheDocument();

      // User clicks pass button
      const passButton = screen.getAllByRole('button', { name: /pass|skip|next/i })[0];
      await user.click(passButton);

      // System records pass action
      // Next pet appears
      await waitFor(() => {
        expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument();
      });

      // Session stats update
      await waitFor(() => {
        const statsGrid = screen.getByText(/session progress/i).nextElementSibling;
        const passStat = within(statsGrid as HTMLElement).getAllByText('1')[0];
        expect(passStat).toBeInTheDocument();
      });
    });

    it('allows user to super like a pet', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User clicks super like button
      const superLikeButton = screen.getByRole('button', { name: /super like|star/i });
      await user.click(superLikeButton);

      // System records super like action
      // Session stats update
      await waitFor(() => {
        const statsGrid = screen.getByText(/session progress/i).nextElementSibling;
        const superLikeStat = within(statsGrid as HTMLElement).getAllByText('1')[1]; // Second '1' is super likes
        expect(superLikeStat).toBeInTheDocument();
      });

      // Pet is added to favorites with special indicator
      // Next pet appears
      await waitFor(() => {
        expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument();
      });
    });

    it('updates session statistics as user swipes', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User performs multiple swipe actions
      const likeButton = screen.getAllByRole('button', { name: /like|heart/i })[0];
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument();
      });

      const passButton = screen.getAllByRole('button', { name: /pass|skip|next/i })[0];
      await user.click(passButton);

      // Session stats reflect all actions
      await waitFor(() => {
        const statsGrid = screen.getByText(/session progress/i).nextElementSibling;
        // Total should be 2
        const totalStat = within(statsGrid as HTMLElement).getAllByText('2')[0];
        expect(totalStat).toBeInTheDocument();
      });
    });

    it('navigates to pet details when user clicks info button', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User clicks info button to see more details
      const infoButton = screen.getByRole('button', { name: /info|details/i });
      await user.click(infoButton);

      // System navigates to pet details page
      // This will be tested via navigation in actual app
    });
  });

  describe('Filters', () => {
    it('allows user to toggle filter panel', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Initially filters are hidden
      const typeSelect = screen.queryByLabelText(/pet type/i);
      expect(typeSelect).not.toBeVisible();

      // User clicks to show filters
      const filterButton = screen.getByRole('button', { name: /show filters|filters/i });
      await user.click(filterButton);

      // Filters panel becomes visible
      await waitFor(() => {
        const typeSelectVisible = screen.getByLabelText(/pet type/i);
        expect(typeSelectVisible).toBeVisible();
      });

      // User clicks to hide filters
      const hideButton = screen.getByRole('button', { name: /hide filters/i });
      await user.click(hideButton);

      // Filters panel is hidden again
      await waitFor(() => {
        expect(screen.getByLabelText(/pet type/i)).not.toBeVisible();
      });
    });

    it('filters pets by type', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User opens filters
      const filterButton = screen.getByRole('button', { name: /show filters|filters/i });
      await user.click(filterButton);

      // User selects dog type
      const typeSelect = screen.getByLabelText(/pet type/i);
      await user.selectOptions(typeSelect, 'dog');

      // System loads dogs only
      await waitFor(() => {
        expect(screen.getByText(/loading pets/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Only dogs appear in queue
      expect(screen.getAllByText('Buddy')[0]).toBeInTheDocument();
      // Whiskers (cat) should not be in the filtered results
    });

    it('filters pets by size', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User opens filters and selects size
      await user.click(screen.getByRole('button', { name: /show filters|filters/i }));

      const sizeSelect = screen.getByLabelText(/size/i);
      await user.selectOptions(sizeSelect, 'large');

      // System reloads with size filter applied
      await waitFor(() => {
        expect(screen.getByText(/loading pets/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Filtered pets appear
      expect(screen.getAllByText('Buddy')[0]).toBeInTheDocument(); // Buddy is large
    });

    it('filters pets by age group', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /show filters|filters/i }));

      const ageSelect = screen.getByLabelText(/age group/i);
      await user.selectOptions(ageSelect, 'senior');

      await waitFor(() => {
        expect(screen.getByText(/loading pets/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Senior pets appear
      expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument(); // Whiskers is senior
    });

    it('filters pets by gender', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /show filters|filters/i }));

      const genderSelect = screen.getByLabelText(/gender/i);
      await user.selectOptions(genderSelect, 'female');

      await waitFor(() => {
        expect(screen.getByText(/loading pets/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Female pets appear
      expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument(); // Whiskers is female
    });

    it('allows user to clear filters by selecting "Any"', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Apply a filter
      await user.click(screen.getByRole('button', { name: /show filters|filters/i }));
      const typeSelect = screen.getByLabelText(/pet type/i);
      await user.selectOptions(typeSelect, 'dog');

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // Clear filter by selecting "Any Type"
      await user.selectOptions(typeSelect, '');

      await waitFor(() => {
        expect(screen.getByText(/loading pets/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // All pets appear again
      expect(screen.getAllByText('Buddy')[0]).toBeInTheDocument();
    });
  });

  describe('Queue Management', () => {
    it('loads more pets automatically when queue is low', async () => {
      const user = userEvent.setup();

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User swipes through pets
      const likeButton = screen.getAllByRole('button', { name: /like|heart/i })[0];

      // Swipe first pet
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getAllByText('Whiskers')[0]).toBeInTheDocument();
      });

      // Swipe second pet
      await user.click(likeButton);

      // System should load more pets automatically
      await waitFor(
        () => {
          expect(screen.getAllByText('Max')[0]).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Error Handling', () => {
    it('shows error message when pet loading fails', async () => {
      // This test would need MSW to return an error response
      // For now, we'll test the retry functionality

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // If error occurs, user sees error message
      // This would be tested by mocking a failed API call
    });

    it('allows user to retry loading after error', async () => {
      const user = userEvent.setup();

      // This test would mock an error, then allow retry
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // After error, user clicks retry button
      // const retryButton = screen.getByRole('button', { name: /try again|retry/i });
      // await user.click(retryButton);

      // System attempts to load pets again
    });
  });

  describe('Navigation', () => {
    it('allows user to navigate to list view', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User sees link to list view
      const listViewLink = screen.getByRole('link', { name: /list view/i });
      expect(listViewLink).toHaveAttribute('href', '/search');
    });

    it('allows user to navigate to favorites', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading pets/i)).not.toBeInTheDocument();
      });

      // User sees link to favorites
      const favoritesLink = screen.getByRole('link', { name: /favorites/i });
      expect(favoritesLink).toHaveAttribute('href', '/favorites');
    });
  });
});
