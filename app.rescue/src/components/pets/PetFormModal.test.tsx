/**
 * Behavioural tests for the rescue PetFormModal.
 *
 * Documents:
 *   - ADS-578: the adoption fee field accepts only non-negative numeric
 *     values (up to 2 decimal places) and rejects free-text values such as
 *     "free", "£150", or "tbd".
 *   - ADS-574: the image upload field — multi-file picker, per-file states
 *     (pending/uploading/uploaded/error), drag-to-reorder, inline mime/size
 *     validation, and the `images` URL array in the submit payload.
 */

import type { ImageUploadResponse } from '@adopt-dont-shop/lib.api';
import type { PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib.pets';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../test-utils/render';
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

describe('PetFormModal — image upload field (ADS-574)', () => {
  const makeImageFile = (name = 'photo.png', size = 1024, mime = 'image/png'): File => {
    const blob = new Blob([new Uint8Array(size)], { type: mime });
    return new File([blob], name, { type: mime });
  };

  const makeUploadResponse = (suffix: string): ImageUploadResponse => ({
    url: `/uploads/pets/pets_${suffix}.png`,
    thumbnail_url: `/uploads/pets/pets_${suffix}.thumb.png`,
    original_filename: `photo-${suffix}.png`,
    size_bytes: 1024,
    content_type: 'image/png',
  });

  it('renders a multi-file image picker', () => {
    renderWithProviders(
      <PetFormModal isOpen={true} onClose={() => {}} onSubmit={() => Promise.resolve()} />
    );

    const fileInput = screen.getByLabelText(/add pet photos/i);
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('multiple');
    expect(fileInput).toHaveAttribute('accept', expect.stringContaining('image/'));
  });

  it('rejects non-image files with an inline error and never calls the upload service', async () => {
    const uploadImage = vi.fn(() => Promise.resolve(makeUploadResponse('x')));
    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => Promise.resolve()}
        uploadImage={uploadImage}
      />
    );

    const fileInput = screen.getByLabelText(/add pet photos/i);
    const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [badFile] } });
    });

    expect(await screen.findByText(/not a supported image type/i)).toBeInTheDocument();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('rejects files above the size limit with an inline error', async () => {
    const uploadImage = vi.fn(() => Promise.resolve(makeUploadResponse('x')));
    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => Promise.resolve()}
        uploadImage={uploadImage}
      />
    );

    const fileInput = screen.getByLabelText(/add pet photos/i);
    const oversize = makeImageFile('huge.png', 11 * 1024 * 1024);
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [oversize] } });
    });

    expect(await screen.findByText(/too large/i)).toBeInTheDocument();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('progresses an image through uploading -> uploaded and stores its url in the create payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());

    // Hold the upload promise so the test can observe the uploading state.
    let resolveUpload: (response: ImageUploadResponse) => void = () => {};
    const uploadImage = vi.fn(
      () =>
        new Promise<ImageUploadResponse>(resolve => {
          resolveUpload = resolve;
        })
    );

    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        uploadImage={uploadImage}
      />
    );

    await fillRequiredFields(user);

    const fileInput = screen.getByLabelText(/add pet photos/i);
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [makeImageFile('rex.png')] } });
    });

    expect(await screen.findByText(/uploading/i)).toBeInTheDocument();
    expect(uploadImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpload(makeUploadResponse('rex'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.images).toEqual(['/uploads/pets/pets_rex.png']);
  });

  it('surfaces an inline error when the upload service rejects and excludes the file from the payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());

    const uploadImage = vi.fn(() => Promise.reject(new Error('Server is down')));

    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        uploadImage={uploadImage}
      />
    );

    await fillRequiredFields(user);

    const fileInput = screen.getByLabelText(/add pet photos/i);
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [makeImageFile('rex.png')] } });
    });

    expect(await screen.findByText(/upload failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.images ?? []).toEqual([]);
  });

  it('lets the user remove an uploaded image before submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    const uploadImage = vi
      .fn<(file: File) => Promise<ImageUploadResponse>>()
      .mockResolvedValueOnce(makeUploadResponse('a'))
      .mockResolvedValueOnce(makeUploadResponse('b'));

    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        uploadImage={uploadImage}
      />
    );

    await fillRequiredFields(user);

    const fileInput = screen.getByLabelText(/add pet photos/i);
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [makeImageFile('a.png'), makeImageFile('b.png')] },
      });
    });

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledTimes(2);
    });

    const removeButtons = await screen.findAllByRole('button', { name: /remove image/i });
    await user.click(removeButtons[0]);

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.images).toEqual(['/uploads/pets/pets_b.png']);
  });

  it('moves an image to the primary slot when the "make primary" control is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    const uploadImage = vi
      .fn<(file: File) => Promise<ImageUploadResponse>>()
      .mockResolvedValueOnce(makeUploadResponse('a'))
      .mockResolvedValueOnce(makeUploadResponse('b'));

    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        uploadImage={uploadImage}
      />
    );

    await fillRequiredFields(user);

    const fileInput = screen.getByLabelText(/add pet photos/i);
    await act(async () => {
      fireEvent.change(fileInput, {
        target: { files: [makeImageFile('a.png'), makeImageFile('b.png')] },
      });
    });

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledTimes(2);
    });

    const makePrimaryButtons = await screen.findAllByRole('button', { name: /make primary/i });
    // The first image is already primary so its button is disabled; click the
    // second one to promote it.
    await user.click(makePrimaryButtons[1]);

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.images).toEqual(['/uploads/pets/pets_b.png', '/uploads/pets/pets_a.png']);
  });

  it('refuses to add more files once the max count is reached', async () => {
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    const uploadImage = vi
      .fn<(file: File) => Promise<ImageUploadResponse>>()
      .mockResolvedValue(makeUploadResponse('x'));

    renderWithProviders(
      <PetFormModal
        isOpen={true}
        onClose={() => {}}
        onSubmit={onSubmit}
        uploadImage={uploadImage}
      />
    );

    const fileInput = screen.getByLabelText(/add pet photos/i);
    // 11 files in a single drop — only the first 10 should be accepted.
    const files = Array.from({ length: 11 }, (_, i) => makeImageFile(`p${i}.png`));
    await act(async () => {
      fireEvent.change(fileInput, { target: { files } });
    });

    expect(await screen.findByText(/maximum of 10 images/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledTimes(10);
    });
  });
});
