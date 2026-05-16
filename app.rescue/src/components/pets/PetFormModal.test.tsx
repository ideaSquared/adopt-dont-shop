/**
 * Behavioural tests for the rescue PetFormModal adoption fee field.
 *
 * Documents ADS-578: the field accepts only non-negative numeric values
 * (up to 2 decimal places) and rejects free-text values such as "free",
 * "£150", or "tbd".
 */

import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib.pets';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils/render';
import PetFormModal from './PetFormModal';

type SubmitArg = PetCreateData | PetUpdateData;

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/pet name/i), 'Rex');
  await user.type(screen.getByLabelText(/primary breed/i), 'Labrador');
  await user.type(screen.getByLabelText(/^color/i), 'Brown');
  await user.type(screen.getByLabelText(/short description/i), 'A friendly dog.');
};

describe('PetFormModal — adoption fee field (ADS-578)', () => {
  it('renders the adoption fee as a numeric input with a £ currency adornment', () => {
    renderWithProviders(
      <PetFormModal isOpen={true} onClose={() => {}} onSubmit={() => Promise.resolve()} />
    );

    const feeInput = screen.getByLabelText(/adoption fee/i);
    expect(feeInput).toHaveAttribute('type', 'number');
    expect(feeInput).toHaveAttribute('min', '0');
    expect(feeInput).toHaveAttribute('step', '0.01');
    expect(screen.getByText('£')).toBeInTheDocument();
  });

  it('drops non-numeric characters typed into the field (browser-enforced numeric input)', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PetFormModal isOpen={true} onClose={() => {}} onSubmit={() => Promise.resolve()} />
    );

    const feeInput = screen.getByLabelText(/adoption fee/i);
    await user.type(feeInput, 'free');
    // The browser's number input filters letters; the visible value stays empty.
    expect((feeInput as HTMLInputElement).value).toBe('');
  });

  it('rejects values with more than 2 decimal places and blocks submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    const { container } = renderWithProviders(
      <PetFormModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />
    );

    await fillRequiredFields(user);
    // step="0.01" doesn't actually block typed values in jsdom — exercise
    // the form-level guard that rejects sub-pence precision.
    fireEvent.change(screen.getByLabelText(/adoption fee/i), { target: { value: '150.123' } });

    const form = container.querySelector('form');
    if (!form) {
      throw new Error('form not found');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/adoption fee must be a non-negative number/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('accepts a valid two-decimal amount and submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    renderWithProviders(<PetFormModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />);

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/adoption fee/i), '150.5');
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.adoptionFee).toBe('150.5');
  });

  it('accepts an empty fee (optional field)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    renderWithProviders(<PetFormModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />);

    await fillRequiredFields(user);
    // Leave the adoption fee blank.
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
