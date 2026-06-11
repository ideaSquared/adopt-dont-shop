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

// Pre-ADS-646 the form gated submission on name + breed + colour + short
// description. After ADS-646 only the name is required, but we still type
// into the same four fields here so existing assertions about the
// submission payload keep working.
const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/pet name/i), 'Rex');
  await user.type(screen.getByLabelText(/primary breed/i), 'Labrador');
  await user.type(screen.getByLabelText(/^color/i), 'Brown');
  await user.type(screen.getByLabelText(/short description/i), 'A friendly dog.');
};

describe('PetFormModal — minimum required fields (ADS-646)', () => {
  it('publishes a pet with only the name filled in (other fields default)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    renderWithProviders(<PetFormModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/pet name/i), 'Rex');
    // No breed / colour / description / age — just submit.
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.name).toBe('Rex');
    // Backend requires type / gender / size / ageGroup — the form supplies
    // safe defaults so staff don't have to choose to publish.
    expect(submitted.type).toBe('dog');
    expect(submitted.gender).toBe('male');
    expect(submitted.size).toBe('medium');
    expect(submitted.ageGroup).toBe('adult');
  });

  it('shows a hint banner explaining that only the name is required', () => {
    renderWithProviders(
      <PetFormModal isOpen={true} onClose={() => {}} onSubmit={() => Promise.resolve()} />
    );

    expect(screen.getByText(/only the pet's name is required to publish/i)).toBeInTheDocument();
  });

  it('does not block submission when breed, colour or short description are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    renderWithProviders(<PetFormModal isOpen={true} onClose={() => {}} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/pet name/i), 'Rex');
    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/breed is required/i)).toBeNull();
    expect(screen.queryByText(/color is required/i)).toBeNull();
    expect(screen.queryByText(/short description is required/i)).toBeNull();
  });
});

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

  it('surfaces an inline upload error and blocks submission until errored images are resolved (UX P0/P1 #10)', async () => {
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

    // The form refuses to submit and surfaces a remove-or-retry message
    // instead of silently dropping the failed image.
    expect(await screen.findByText(/some images failed to upload/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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

  it('moves the cover image via drag-and-drop reordering (ADS-646)', async () => {
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

    // Wait for both uploads to resolve and the rows to enter the
    // "uploaded" state (draggable=true).
    await waitFor(() => {
      const items = screen
        .getAllByRole('listitem')
        .filter(li => li.getAttribute('draggable') === 'true');
      expect(items).toHaveLength(2);
    });

    const items = screen
      .getAllByRole('listitem')
      .filter(li => li.getAttribute('draggable') === 'true');

    // Drag the second photo onto the first slot — the dropped item should
    // become the new cover. Each event is wrapped in its own act() so the
    // React state update for `dragIndex` is committed before the next
    // event reads it.
    await act(async () => {
      fireEvent.dragStart(items[1]);
    });
    await act(async () => {
      fireEvent.dragOver(items[0]);
    });
    await act(async () => {
      fireEvent.drop(items[0]);
    });
    await act(async () => {
      fireEvent.dragEnd(items[1]);
    });

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    // After the drop, image "b" is at index 0 (the cover slot) and "a"
    // follows. The submit payload preserves the order.
    expect(submitted.images).toEqual(['/uploads/pets/pets_b.png', '/uploads/pets/pets_a.png']);
  });

  it('exposes keyboard-accessible Move up / Move down controls that reorder images', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((_data: SubmitArg) => Promise.resolve());
    const uploadImage = vi
      .fn<(file: File) => Promise<ImageUploadResponse>>()
      .mockResolvedValueOnce(makeUploadResponse('a'))
      .mockResolvedValueOnce(makeUploadResponse('b'))
      .mockResolvedValueOnce(makeUploadResponse('c'));

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
        target: {
          files: [makeImageFile('a.png'), makeImageFile('b.png'), makeImageFile('c.png')],
        },
      });
    });

    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /move down: a\.png/i })).toBeEnabled();
    });

    // Click "Move down" on the first photo — a.png moves to index 1, b.png
    // moves to index 0 (becoming the cover).
    await user.click(screen.getByRole('button', { name: /move down: a\.png/i }));

    // After the move the aria-labels reflect the new positions: the first
    // row can no longer move up; the last row can no longer move down.
    expect(screen.getByRole('button', { name: /move up: b\.png/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move down: c\.png/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /add pet/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.images).toEqual([
      '/uploads/pets/pets_b.png',
      '/uploads/pets/pets_a.png',
      '/uploads/pets/pets_c.png',
    ]);
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
