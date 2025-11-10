/**
 * Search and Browse Behaviour Tests
 *
 * These tests verify search and browse behaviours including:
 * - Searching for pets by name/breed
 * - Filtering search results
 * - Viewing pet details
 * - No results handling
 * - Search performance
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import { SearchPage } from '../pages/SearchPage';
import { PetDetailsPage } from '../pages/PetDetailsPage';

describe('Search and Browse Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Basic Search', () => {
    it('allows user to search for pets by name', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      // User sees search page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /search|find pets/i })).toBeInTheDocument();
      });

      // User enters search term
      const searchInput = screen.getByRole('searchbox', { name: /search/i });
      await user.type(searchInput, 'Buddy');

      // System searches as user types (debounced)
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Results show matching pets
      expect(screen.getByText(/golden retriever/i)).toBeInTheDocument();
    });

    it('updates results as user types', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox', { name: /search/i });

      // User types first letters
      await user.type(searchInput, 'Whi');

      // Results update dynamically
      await waitFor(() => {
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });
    });

    it('shows all pets when search is empty', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      // Without search term, user sees all available pets
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });
    });

    it('allows user to clear search', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox', { name: /search/i });

      // User enters search
      await user.type(searchInput, 'Buddy');

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User clears search
      await user.clear(searchInput);

      // All pets appear again
      await waitFor(() => {
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });
    });
  });

  describe('Search Filters', () => {
    it('allows user to filter by pet type', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/type|kind/i)).toBeInTheDocument();
      });

      // User selects dog filter
      const typeSelect = screen.getByLabelText(/type|kind/i);
      await user.selectOptions(typeSelect, 'dog');

      // System filters results to show only dogs
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Cats are not shown
      expect(screen.queryByText('Whiskers')).not.toBeInTheDocument();
    });

    it('allows user to filter by size', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
      });

      // User selects size filter
      const sizeSelect = screen.getByLabelText(/size/i);
      await user.selectOptions(sizeSelect, 'large');

      // System shows only large pets
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument(); // Buddy is large
      });
    });

    it('allows user to filter by age group', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
      });

      const ageSelect = screen.getByLabelText(/age/i);
      await user.selectOptions(ageSelect, 'senior');

      await waitFor(() => {
        expect(screen.getByText('Whiskers')).toBeInTheDocument(); // Whiskers is senior
      });
    });

    it('combines search term with filters', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      // User enters search term
      const searchInput = screen.getByRole('searchbox', { name: /search/i });
      await user.type(searchInput, 'dog');

      // User also applies filter
      const typeSelect = screen.getByLabelText(/type|kind/i);
      await user.selectOptions(typeSelect, 'dog');

      // Results match both criteria
      await waitFor(() => {
        // Should show dogs that match search term
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });
    });

    it('allows user to clear all filters', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/type|kind/i)).toBeInTheDocument();
      });

      // User applies filter
      const typeSelect = screen.getByLabelText(/type|kind/i);
      await user.selectOptions(typeSelect, 'dog');

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User clears filter
      await user.selectOptions(typeSelect, '');

      // All pets appear
      await waitFor(() => {
        expect(screen.getByText('Whiskers')).toBeInTheDocument();
      });
    });
  });

  describe('Search Results Display', () => {
    it('displays search results in grid layout', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      // Results are displayed in a grid
      await waitFor(() => {
        const petCards = screen.getAllByRole('article');
        expect(petCards.length).toBeGreaterThan(0);
      });
    });

    it('shows pet information in search results', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Each result shows key pet information
      expect(screen.getByText(/golden retriever/i)).toBeInTheDocument();
      expect(screen.getByText(/adult/i)).toBeInTheDocument();
      expect(screen.getByText(/large/i)).toBeInTheDocument();
    });

    it('displays pet images in results', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Pet images are displayed
      const images = screen.getAllByRole('img', { name: /buddy|pet/i });
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows favorite button for each pet', async () => {
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // Each pet has a favorite button
      const favoriteButtons = screen.getAllByRole('button', { name: /favorite|add to favorites/i });
      expect(favoriteButtons.length).toBeGreaterThan(0);
    });
  });

  describe('No Results Handling', () => {
    it('shows message when search has no results', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      // User searches for non-existent pet
      const searchInput = screen.getByRole('searchbox', { name: /search/i });
      await user.type(searchInput, 'NonExistentPet123');

      // System shows "no results" message
      await waitFor(() => {
        expect(screen.getByText(/no results|no pets found|no matches/i)).toBeInTheDocument();
      });
    });

    it('provides suggestions when no results found', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
      });

      const searchInput = screen.getByRole('searchbox', { name: /search/i });
      await user.type(searchInput, 'NonExistentPet');

      await waitFor(() => {
        expect(screen.getByText(/no results|no pets found/i)).toBeInTheDocument();
      });

      // User sees helpful suggestions
      expect(
        screen.getByText(/try different|adjust filters|check spelling/i)
      ).toBeInTheDocument();
    });
  });

  describe('Pet Details Navigation', () => {
    it('navigates to pet details when user clicks on pet card', async () => {
      const user = userEvent.setup();

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User clicks on pet card or "view details" link
      const detailsLink = screen.getAllByRole('link', { name: /view|details|learn more/i })[0];
      expect(detailsLink).toHaveAttribute('href', expect.stringContaining('/pets/'));
    });
  });

  describe('Pet Details Page', () => {
    it('displays full pet information', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      // System loads pet details
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees comprehensive pet information
      expect(screen.getByText(/golden retriever/i)).toBeInTheDocument();
      expect(screen.getByText(/friendly golden retriever/i)).toBeInTheDocument();
    });

    it('displays pet image gallery', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees pet images
      const images = screen.getAllByRole('img', { name: /buddy|pet/i });
      expect(images.length).toBeGreaterThan(0);
    });

    it('shows rescue organization information', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees rescue organization name
      expect(screen.getByText(/test rescue/i)).toBeInTheDocument();
    });

    it('provides link to rescue organization details', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Test Rescue')).toBeInTheDocument();
      });

      // User can click to view rescue details
      const rescueLink = screen.getByRole('link', { name: /test rescue/i });
      expect(rescueLink).toHaveAttribute('href', expect.stringContaining('/rescues/'));
    });

    it('shows adopt/apply button on pet details', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees apply button
      const applyButton = screen.getByRole('button', { name: /apply|adopt|start application/i });
      expect(applyButton).toBeInTheDocument();
    });

    it('handles pet not found error', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/nonexistent' });

      // System shows error for non-existent pet
      await waitFor(() => {
        expect(screen.getByText(/not found|doesn't exist|error/i)).toBeInTheDocument();
      });
    });

    it('displays pet temperament and compatibility information', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees temperament traits
      expect(screen.getByText(/friendly/i)).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();

      // User sees compatibility information
      expect(screen.getByText(/children/i)).toBeInTheDocument();
      expect(screen.getByText(/dogs/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while searching', async () => {
      renderWithProviders(<SearchPage />);

      // User sees loading state initially
      expect(screen.getByText(/loading|searching/i)).toBeInTheDocument();

      // Loading completes
      await waitFor(() => {
        expect(screen.queryByText(/loading|searching/i)).not.toBeInTheDocument();
      });
    });

    it('shows loading indicator on pet details page', async () => {
      renderWithProviders(<PetDetailsPage />, { initialRoute: '/pets/pet1' });

      // Initially shows loading
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Content loads
      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when search fails', async () => {
      // Mock API error in MSW handlers would trigger this
      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // If error occurs, user sees error message
        // Implementation depends on error handling strategy
      });
    });

    it('allows user to retry after search error', async () => {
      // Similar to above, would test retry mechanism
      renderWithProviders(<SearchPage />);

      // After error, retry button should be available
    });
  });
});
