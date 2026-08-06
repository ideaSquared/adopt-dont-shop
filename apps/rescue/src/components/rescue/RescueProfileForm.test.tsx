import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils';
import RescueProfileForm from './RescueProfileForm';
import type { RescueProfile } from '../../types/rescue';

const buildRescue = (overrides: Partial<RescueProfile> = {}): RescueProfile => ({
  rescueId: 'r1',
  name: 'Happy Tails',
  rescue_type: 'animal_shelter',
  email: 'contact@happytails.org.uk',
  phone: '020 7946 0958',
  website: 'https://happytails.org.uk',
  description: 'We rehome dogs.',
  address: {
    street: '1 High Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
  },
  verified: true,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('RescueProfileForm', () => {
  it('renders the profile fields with accessible labels', () => {
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/rescue name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postcode/i)).toBeInTheDocument();
  });

  it('blocks submission and shows an error when a required field is cleared', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    await user.clear(screen.getByLabelText(/rescue name/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    const email = screen.getByLabelText(/email address/i);
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects an invalid UK postcode', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    const postcode = screen.getByLabelText(/postcode/i);
    await user.clear(postcode);
    await user.type(postcode, 'NOTAPOSTCODE');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/valid uk postcode/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the edited top-level and address values when valid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    const name = screen.getByLabelText(/rescue name/i);
    await user.clear(name);
    await user.type(name, 'New Name Rescue');

    const city = screen.getByLabelText(/town\/city/i);
    await user.clear(city);
    await user.type(city, 'Manchester');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe('New Name Rescue');
    expect(saved.email).toBe('contact@happytails.org.uk');
    expect(saved.address.city).toBe('Manchester');
    expect(saved.address.postcode).toBe('SW1A 1AA');
    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
  });
});
