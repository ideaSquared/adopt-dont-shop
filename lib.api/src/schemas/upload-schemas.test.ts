import { describe, expect, it } from 'vitest';
import { ImageUploadResponseSchema } from './upload-schemas';

describe('ImageUploadResponseSchema', () => {
  it('accepts a well-formed staged image upload response', () => {
    const parsed = ImageUploadResponseSchema.parse({
      url: '/uploads/pets/pets_1_abc.jpg',
      thumbnail_url: '/uploads/pets/pets_1_abc.thumb.jpg',
      original_filename: 'photo.jpg',
      size_bytes: 12345,
      content_type: 'image/jpeg',
    });

    expect(parsed.url).toBe('/uploads/pets/pets_1_abc.jpg');
    expect(parsed.thumbnail_url).toBe('/uploads/pets/pets_1_abc.thumb.jpg');
  });

  it('rejects a response missing the thumbnail_url field', () => {
    const result = ImageUploadResponseSchema.safeParse({
      url: '/uploads/pets/x.jpg',
      original_filename: 'photo.jpg',
      size_bytes: 1,
      content_type: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative size_bytes value', () => {
    const result = ImageUploadResponseSchema.safeParse({
      url: '/uploads/pets/x.jpg',
      thumbnail_url: '/uploads/pets/x.thumb.jpg',
      original_filename: 'photo.jpg',
      size_bytes: -1,
      content_type: 'image/jpeg',
    });
    expect(result.success).toBe(false);
  });
});
