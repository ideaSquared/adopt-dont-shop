import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor, fireEvent } from '../../test-utils';
import RescueProfileForm from './RescueProfileForm';
import type { RescueProfile } from '../../types/rescue';

// The global test setup renders SelectInput as an empty <select>. Expose the props the form
// passes so the country contract (ISO code value, built-in country list) can be asserted.
vi.mock('@adopt-dont-shop/lib.components', async importOriginal => {
  const actual = await importOriginal<typeof import('@adopt-dont-shop/lib.components')>();
  return {
    ...actual,
    SelectInput: ({
      label,
      value,
      isCountrySelect,
      onChange,
    }: import('@adopt-dont-shop/lib.components').SelectInputProps) => (
      <actual.Input
        aria-label={label}
        data-country-select={String(Boolean(isCountrySelect))}
        value={typeof value === 'string' ? value : ''}
        onChange={event => onChange?.(event.target.value)}
      />
    ),
  };
});

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
    country: 'GB',
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

  it('does not offer or submit a rescue type, which the backend cannot store', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    expect(screen.queryByText(/rescue type/i)).not.toBeInTheDocument();

    const name = screen.getByLabelText(/rescue name/i);
    await user.clear(name);
    await user.type(name, 'Renamed');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('rescue_type');
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
    expect(saved.address.country).toBe('GB');
    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
  });

  it('holds the API country code in the built-in country select', () => {
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={vi.fn()} />);

    const country = screen.getByLabelText(/country/i);
    expect(country).toHaveValue('GB');
    expect(country).toHaveAttribute('data-country-select', 'true');
  });

  it('saves the newly selected country as its code', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<RescueProfileForm rescue={buildRescue()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/country/i), { target: { value: 'IE' } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].address.country).toBe('IE');
  });
});
