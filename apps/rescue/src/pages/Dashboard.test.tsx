import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import type {
  RescueDashboardData,
  RecentActivity,
  DashboardNotification,
} from '../types/dashboard';

const { useDashboardDataMock, clearTokensMock, clearCsrfTokenMock, reloadMock } = vi.hoisted(
  () => ({
    useDashboardDataMock: vi.fn(),
    clearTokensMock: vi.fn(),
    clearCsrfTokenMock: vi.fn(),
    reloadMock: vi.fn(),
  })
);

vi.mock('../hooks', () => ({
  useDashboardData: useDashboardDataMock,
}));

vi.mock('@adopt-dont-shop/lib.auth', () => ({
  useAuth: () => ({ user: { firstName: 'Riley', userType: 'rescue_staff' } }),
  authService: { clearTokens: clearTokensMock },
  STORAGE_KEYS: { USER: 'user' },
}));

vi.mock('../services/libraryServices', () => ({
  apiService: { clearCsrfToken: clearCsrfTokenMock },
}));

vi.mock('../components/dashboard/UnreadMessagesPanel', () => ({
  UnreadMessagesPanel: () => <div data-testid="unread-messages-panel" />,
}));

import Dashboard from './Dashboard';

const dashboardData: RescueDashboardData = {
  totalPets: 12,
  successfulAdoptions: 8,
  pendingApplications: 3,
  averageRating: 4.5,
  monthlyAdoptions: [
    { month: 'Jan', adoptions: 2 },
    { month: 'Feb', adoptions: 5 },
  ],
  petStatusDistribution: [{ name: 'Available', value: 6, color: '#0a0' }],
  petTypeDistribution: [{ name: 'Dog', value: 7 }],
  totalApplications: 10,
  adoptionRate: 66,
  averageResponseTime: 1,
};

const recentActivities: RecentActivity[] = [
  { id: 'a1', timestamp: new Date('2026-01-01'), type: 'adoption', message: 'Buddy was adopted' },
];

const notifications: DashboardNotification[] = [
  {
    id: 'n1',
    type: 'success',
    title: 'New application',
    message: 'A new application arrived',
    timestamp: new Date('2026-01-02'),
    read: false,
  },
];

describe('Rescue Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });
  });

  it('shows a loading skeleton while dashboard data is fetching', () => {
    useDashboardDataMock.mockReturnValue({
      dashboardData: null,
      recentActivities: [],
      notifications: [],
      loading: true,
      error: null,
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'Rescue Dashboard' })).toBeInTheDocument();
  });

  it('shows an error card with recovery actions when the fetch fails', () => {
    useDashboardDataMock.mockReturnValue({
      dashboardData: null,
      recentActivities: [],
      notifications: [],
      loading: false,
      error: 'network down',
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/unable to load dashboard data: network down/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear auth & restart/i }));
    expect(clearTokensMock).toHaveBeenCalled();
    expect(clearCsrfTokenMock).toHaveBeenCalled();
    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows a fallback message when there is no dashboard data', () => {
    useDashboardDataMock.mockReturnValue({
      dashboardData: null,
      recentActivities: [],
      notifications: [],
      loading: false,
      error: null,
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('No dashboard data available.')).toBeInTheDocument();
  });

  it('renders metrics, activity, and notifications once data has loaded', () => {
    useDashboardDataMock.mockReturnValue({
      dashboardData,
      recentActivities,
      notifications,
      loading: false,
      error: null,
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByText(/welcome back, riley/i)).toBeInTheDocument();
    expect(screen.getByTestId('unread-messages-panel')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // total pets
    expect(screen.getByText('Buddy was adopted')).toBeInTheDocument();
    expect(screen.getByText('New application')).toBeInTheDocument();
    // Unread badge shows the count of unread notifications.
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows and dismisses the first-time onboarding banner when the rescue has no pets or applications', () => {
    useDashboardDataMock.mockReturnValue({
      dashboardData: { ...dashboardData, totalPets: 0, pendingApplications: 0 },
      recentActivities: [],
      notifications: [],
      loading: false,
      error: null,
    });

    renderWithProviders(<Dashboard />);

    expect(screen.getByTestId('onboarding-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss onboarding banner/i }));
    expect(screen.queryByTestId('onboarding-banner')).not.toBeInTheDocument();
  });
});
