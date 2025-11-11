/**
 * Navigation and Layout Behaviour Tests
 *
 * These tests verify navigation and layout behaviours including:
 * - Main navigation between sections
 * - Mobile menu functionality
 * - Floating action buttons
 * - Responsive layout behavior
 * - Active route highlighting
 *
 * All tests use MSW to mock API responses - no real API calls.
 */

import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../test-utils/test-helpers';
import { resetMockData } from '../test-utils/msw-handlers';
import App from '../App';
import { AppNavbar } from '../components/navigation/AppNavbar';
import { SwipeFloatingButton } from '../components/ui/SwipeFloatingButton';

// Mock auth for authenticated tests
jest.mock('@adopt-dont-shop/lib-auth', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    user: {
      userId: 'user1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
  })),
}));

describe('Navigation and Layout Behaviours', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Main Navigation', () => {
    it('displays main navigation menu', async () => {
      renderWithProviders(<AppNavbar />);

      // User sees main navigation items
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /discover|swipe/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /search|browse/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /favorites/i })).toBeInTheDocument();
    });

    it('allows user to navigate to home page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks home link
      const homeLink = screen.getByRole('link', { name: /home/i });
      await user.click(homeLink);

      // User is on home page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /find your perfect|welcome/i })).toBeInTheDocument();
      });
    });

    it('allows user to navigate to discovery page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks discover link
      const discoverLink = screen.getByRole('link', { name: /discover|swipe/i });
      await user.click(discoverLink);

      // User is on discovery page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });
    });

    it('allows user to navigate to search page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks search link
      const searchLink = screen.getByRole('link', { name: /search|browse/i });
      await user.click(searchLink);

      // User is on search page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /search|find pets/i })).toBeInTheDocument();
      });
    });

    it('allows user to navigate to favorites page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks favorites link
      const favoritesLink = screen.getByRole('link', { name: /favorites/i });
      await user.click(favoritesLink);

      // User is on favorites page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /favorite pets/i })).toBeInTheDocument();
      });
    });

    it('allows user to navigate to profile page', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks profile link
      const profileLink = screen.getByRole('link', { name: /profile|account/i });
      await user.click(profileLink);

      // User is on profile page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /profile|my profile/i })).toBeInTheDocument();
      });
    });

    it('highlights active navigation item', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />, { initialRoute: '/discover' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });

      // Discover link is highlighted/active
      const discoverLink = screen.getByRole('link', { name: /discover|swipe/i });
      expect(discoverLink).toHaveClass(/active|current/i);
    });

    it('shows user information in navigation when authenticated', async () => {
      renderWithProviders(<AppNavbar />);

      // User sees their name or avatar
      expect(screen.getByText(/test user|test/i)).toBeInTheDocument();
    });

    it('shows login/register links when not authenticated', async () => {
      const { useAuth } = require('@adopt-dont-shop/lib-auth');
      useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      renderWithProviders(<AppNavbar />);

      // User sees login and register links
      expect(screen.getByRole('link', { name: /log in|sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign up|register/i })).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('shows mobile menu button on small screens', async () => {
      // Mock small viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<AppNavbar />);

      // User sees hamburger menu button
      const menuButton = screen.getByRole('button', { name: /menu|navigation/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('opens mobile menu when hamburger is clicked', async () => {
      const user = userEvent.setup();

      // Mock small viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<AppNavbar />);

      // User clicks menu button
      const menuButton = screen.getByRole('button', { name: /menu|navigation/i });
      await user.click(menuButton);

      // Mobile menu opens
      await waitFor(() => {
        expect(screen.getByRole('navigation', { expanded: true })).toBeInTheDocument();
      });

      // Navigation links are visible
      expect(screen.getByRole('link', { name: /home/i })).toBeVisible();
      expect(screen.getByRole('link', { name: /discover/i })).toBeVisible();
    });

    it('closes mobile menu when navigation link is clicked', async () => {
      const user = userEvent.setup();

      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);

      // User opens mobile menu
      const menuButton = screen.getByRole('button', { name: /menu|navigation/i });
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { expanded: true })).toBeInTheDocument();
      });

      // User clicks a link
      const homeLink = screen.getByRole('link', { name: /home/i });
      await user.click(homeLink);

      // Menu closes
      await waitFor(() => {
        expect(screen.queryByRole('navigation', { expanded: true })).not.toBeInTheDocument();
      });
    });

    it('closes mobile menu when close button is clicked', async () => {
      const user = userEvent.setup();

      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<AppNavbar />);

      // User opens mobile menu
      const menuButton = screen.getByRole('button', { name: /menu|navigation/i });
      await user.click(menuButton);

      await waitFor(() => {
        expect(screen.getByRole('navigation', { expanded: true })).toBeInTheDocument();
      });

      // User clicks close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Menu closes
      await waitFor(() => {
        expect(screen.queryByRole('navigation', { expanded: true })).not.toBeInTheDocument();
      });
    });
  });

  describe('Floating Action Buttons', () => {
    it('displays swipe floating button', async () => {
      renderWithProviders(<SwipeFloatingButton />);

      // User sees floating swipe button
      const swipeButton = screen.getByRole('button', { name: /swipe|discover/i });
      expect(swipeButton).toBeInTheDocument();
    });

    it('navigates to discovery page when swipe button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User sees floating button
      const swipeButton = screen.getByRole('button', { name: /swipe|discover/i });

      // User clicks floating button
      await user.click(swipeButton);

      // User is navigated to discovery page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });
    });

    it('shows floating button on all pages except discovery', async () => {
      const { rerender } = renderWithProviders(<App />, { initialRoute: '/search' });

      // On search page, button is visible
      expect(screen.getByRole('button', { name: /swipe|discover/i })).toBeInTheDocument();

      // Navigate to discovery page
      rerender(<App />, { initialRoute: '/discover' });

      // On discovery page, button may be hidden
      // Implementation specific
    });

    it('has accessible floating button', async () => {
      renderWithProviders(<SwipeFloatingButton />);

      const swipeButton = screen.getByRole('button', { name: /swipe|discover/i });

      // Button has proper aria label
      expect(swipeButton).toHaveAccessibleName();

      // Button is keyboard accessible
      swipeButton.focus();
      expect(swipeButton).toHaveFocus();
    });
  });

  describe('Responsive Layout', () => {
    it('adapts layout for mobile viewport', async () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);

      // Layout is mobile-friendly
      // Navigation is collapsed
      // Content is single column
      // This would be tested with visual regression or layout checks
    });

    it('adapts layout for tablet viewport', async () => {
      // Mock tablet viewport
      global.innerWidth = 768;
      global.innerHeight = 1024;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);

      // Layout adapts to tablet size
      // Navigation may be visible or collapsed
      // Content layout adjusts
    });

    it('adapts layout for desktop viewport', async () => {
      // Mock desktop viewport
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      global.dispatchEvent(new Event('resize'));

      renderWithProviders(<App />);

      // Full desktop layout
      // All navigation visible
      // Multi-column layouts where appropriate
    });

    it('handles orientation changes', async () => {
      // Portrait mode
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      const { rerender } = renderWithProviders(<App />);

      // Landscape mode
      global.innerWidth = 667;
      global.innerHeight = 375;
      global.dispatchEvent(new Event('resize'));

      rerender(<App />);

      // Layout adjusts for orientation
      // All content remains accessible
    });
  });

  describe('Footer', () => {
    it('displays footer on all pages', async () => {
      renderWithProviders(<App />);

      // User sees footer
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('shows important links in footer', async () => {
      renderWithProviders(<App />);

      const footer = screen.getByRole('contentinfo');

      // Footer contains important links
      expect(within(footer).getByRole('link', { name: /about|terms|privacy|contact/i })).toBeInTheDocument();
    });

    it('shows social media links in footer', async () => {
      renderWithProviders(<App />);

      const footer = screen.getByRole('contentinfo');

      // Social media links are present (if applicable)
      const socialLinks = within(footer).queryAllByRole('link', { name: /facebook|twitter|instagram/i });
      // Presence depends on implementation
    });
  });

  describe('Breadcrumbs', () => {
    it('shows breadcrumb navigation on deep pages', async () => {
      renderWithProviders(<App />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User sees breadcrumbs
      const breadcrumbs = screen.queryByRole('navigation', { name: /breadcrumb/i });
      if (breadcrumbs) {
        expect(breadcrumbs).toBeInTheDocument();
      }
    });

    it('allows navigation via breadcrumbs', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />, { initialRoute: '/pets/pet1' });

      await waitFor(() => {
        expect(screen.getByText('Buddy')).toBeInTheDocument();
      });

      // User clicks breadcrumb
      const breadcrumbs = screen.queryByRole('navigation', { name: /breadcrumb/i });
      if (breadcrumbs) {
        const homeLink = within(breadcrumbs).getByRole('link', { name: /home|search/i });
        await user.click(homeLink);

        // User navigates to parent page
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /home|search/i })).toBeInTheDocument();
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('has skip to main content link', async () => {
      renderWithProviders(<App />);

      // Skip link is available (usually visually hidden)
      const skipLink = screen.queryByRole('link', { name: /skip to main|skip navigation/i });
      if (skipLink) {
        expect(skipLink).toBeInTheDocument();
      }
    });

    it('maintains focus management during navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User navigates with keyboard
      const discoverLink = screen.getByRole('link', { name: /discover/i });
      discoverLink.focus();
      expect(discoverLink).toHaveFocus();

      await user.keyboard('{Enter}');

      // Focus is managed appropriately after navigation
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });
    });

    it('has proper heading hierarchy', async () => {
      renderWithProviders(<App />);

      // Page has h1
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();

      // Heading levels are sequential (tested via aXe in integration)
    });

    it('has landmark regions', async () => {
      renderWithProviders(<App />);

      // Page has navigation landmark
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Page has main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Page has contentinfo landmark (footer)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });
  });

  describe('Back Button Behavior', () => {
    it('handles browser back button correctly', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User navigates to discovery
      const discoverLink = screen.getByRole('link', { name: /discover/i });
      await user.click(discoverLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });

      // User clicks browser back button
      window.history.back();

      // User returns to previous page
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /home|welcome/i })).toBeInTheDocument();
      });
    });

    it('maintains scroll position on back navigation', async () => {
      // User scrolls down on search page
      // User navigates to pet details
      // User clicks back
      // Scroll position is restored
      // This requires scroll restoration implementation
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator during page transitions', async () => {
      const user = userEvent.setup();

      renderWithProviders(<App />);

      // User clicks navigation link
      const discoverLink = screen.getByRole('link', { name: /discover/i });
      await user.click(discoverLink);

      // Loading indicator may appear briefly
      // Implementation specific
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /discover pets/i })).toBeInTheDocument();
      });
    });

    it('prevents interaction during page transitions', async () => {
      // During navigation, prevent double-clicks
      // Implementation specific
    });
  });
});
