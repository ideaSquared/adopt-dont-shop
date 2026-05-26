import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterRescue from './RegisterRescue';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock apiService
const mockPost = vi.fn();
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <RegisterRescue />
    </MemoryRouter>
  );

const fillField = (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
};

const fillStep1 = () => {
  fillField('First Name', 'Jane');
  fillField('Last Name', 'Doe');
  fillField('Email', 'jane@example.com');
  fillField('Password', 'Password1!');
  fillField('Confirm Password', 'Password1!');
};

const fillStep2 = () => {
  fillField('Organisation Name', 'Happy Tails');
  fillField('Contact Email', 'hello@happytails.org');
};

const fillStep3 = () => {
  fillField('Address', '1 Lane');
  fillField('City', 'London');
  fillField('Postcode', 'SW1A 1AA');
  // Country defaults to GB
};

const clickNext = () => fireEvent.click(screen.getByText('Next'));

describe('RegisterRescue wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 (owner account) initially', () => {
    renderComponent();
    expect(screen.getByText('Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows validation errors on step 1 when fields are empty', () => {
    renderComponent();
    clickNext();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('navigates from step 1 to step 2 when fields are valid', () => {
    renderComponent();
    fillStep1();
    clickNext();
    expect(screen.getByText('Organisation Details')).toBeInTheDocument();
  });

  it('navigates back from step 2 to step 1', () => {
    renderComponent();
    fillStep1();
    clickNext();
    expect(screen.getByText('Organisation Details')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Your Account')).toBeInTheDocument();
  });

  it('validates password mismatch', () => {
    renderComponent();
    fillField('First Name', 'Jane');
    fillField('Last Name', 'Doe');
    fillField('Email', 'jane@example.com');
    fillField('Password', 'Password1!');
    fillField('Confirm Password', 'DifferentPass1!');
    clickNext();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('reaches the review step and shows entered data', () => {
    renderComponent();

    // Step 1
    fillStep1();
    clickNext();
    expect(screen.getByText('Organisation Details')).toBeInTheDocument();

    // Step 2
    fillStep2();
    clickNext();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Address');

    // Step 3
    fillStep3();
    clickNext();
    expect(screen.getByText('Verification Numbers')).toBeInTheDocument();

    // Step 4 - skip optional
    clickNext();

    // Step 5 — Review
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Happy Tails/)).toBeInTheDocument();
  });

  it('submits the registration and shows success', async () => {
    mockPost.mockResolvedValueOnce({
      data: { rescueId: 'r-1', userId: 'u-1' },
      success: true,
    });

    renderComponent();

    // Navigate to review
    fillStep1();
    clickNext();
    fillStep2();
    clickNext();
    fillStep3();
    clickNext();
    clickNext(); // skip step 4
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Registration'));

    await waitFor(() => {
      expect(screen.getByText('Registration Successful')).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/rescues/register',
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        name: 'Happy Tails',
      })
    );
  });

  it('shows an error message when submission fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('Email already registered'));

    renderComponent();

    // Navigate to review
    fillStep1();
    clickNext();
    fillStep2();
    clickNext();
    fillStep3();
    clickNext();
    clickNext();
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Registration'));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('cancel button navigates to login', () => {
    renderComponent();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
