import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent, waitFor } from '../../test-utils';
import AdoptionPolicyForm from './AdoptionPolicyForm';
import type { AdoptionPolicy } from '../../types/rescue';

const buildPolicy = (overrides: Partial<AdoptionPolicy> = {}): AdoptionPolicy => ({
  requireHomeVisit: true,
  requireReferences: true,
  minimumReferenceCount: 2,
  requireVeterinarianReference: true,
  adoptionFeeRange: { min: 0, max: 500 },
  requirements: [],
  policies: [],
  ...overrides,
});

describe('AdoptionPolicyForm', () => {
  it('renders the adoption fee fields with accessible labels', () => {
    renderWithProviders(<AdoptionPolicyForm policy={buildPolicy()} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/minimum fee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum fee/i)).toBeInTheDocument();
  });

  it('rejects a maximum fee below the minimum fee', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<AdoptionPolicyForm policy={buildPolicy()} onSave={onSave} />);

    const min = screen.getByLabelText(/minimum fee/i);
    const max = screen.getByLabelText(/maximum fee/i);
    await user.clear(min);
    await user.type(min, '200');
    await user.clear(max);
    await user.type(max, '100');
    await user.click(screen.getByRole('button', { name: /save policies/i }));

    expect(
      await screen.findByText(/maximum fee must be greater than or equal to the minimum/i)
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('adds a requirement and saves it', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<AdoptionPolicyForm policy={buildPolicy()} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /add requirement/i }));
    await user.type(screen.getByLabelText(/requirement 1/i), 'Must have a garden');
    await user.click(screen.getByRole('button', { name: /save policies/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].requirements).toContain('Must have a garden');
  });

  it('saves valid policy changes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<AdoptionPolicyForm policy={buildPolicy()} onSave={onSave} />);

    const refs = screen.getByLabelText(/minimum number of references/i);
    await user.clear(refs);
    await user.type(refs, '3');
    await user.click(screen.getByRole('button', { name: /save policies/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].minimumReferenceCount).toBe(3);
    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
  });
});
