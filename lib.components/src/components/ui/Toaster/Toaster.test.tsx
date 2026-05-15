// ADS-125: smoke test that the Toaster mounts and displays toast messages
// triggered via the imperative `toast` API.
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Toaster, toast } from './index';

describe('Toaster', () => {
  it('renders without crashing', () => {
    render(<Toaster />);
    // Sonner mounts a region with aria-label "Notifications".
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
  });

  it('shows a success toast when toast.success is called', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Pet saved');
    });
    expect(await screen.findByText('Pet saved')).toBeInTheDocument();
  });

  it('shows an error toast when toast.error is called', async () => {
    render(<Toaster />);
    act(() => {
      toast.error('Something went wrong');
    });
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
