import React, { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@adopt-dont-shop/lib.components';
import { apiService, type ImageUploadResponse } from '@adopt-dont-shop/lib.api';
import { Pet, PetCreateData, PetUpdateData } from '@adopt-dont-shop/lib.pets';
import * as styles from './PetFormModal.css';

// ADS-574: image uploader configuration.
//
// `MAX_IMAGES` matches the rescue-side product cap (a handful of photos per
// pet — not a hard backend limit, just a sensible UX ceiling).
// `MAX_IMAGE_BYTES` mirrors the backend multer `petImageUpload` size limit
// so we reject locally before the network round trip rather than after a
// 413. The backend also magic-byte-checks the MIME so we still validate
// `image/*` here to spare the user a server rejection.
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

type UploadedImage = {
  // Local id keyed off the file slot so React can track items across reorders
  // without using array index as the key.
  localId: string;
  filename: string;
  status: 'uploading' | 'uploaded' | 'error';
  // Populated once the upload succeeds. Stays undefined while uploading /
  // after a failure so the submit payload only contains finalised URLs.
  url?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
};

type UploadImageFn = (file: File) => Promise<ImageUploadResponse>;

interface PetFormModalProps {
  isOpen: boolean;
  pet?: Pet;
  onClose: () => void;
  onSubmit: (data: PetCreateData | PetUpdateData) => Promise<void>;
  /**
   * Test seam — defaults to the real `apiService.uploadImage`. The rescue
   * page renders the modal without overriding this; tests inject a mock so
   * they don't depend on `fetch`.
   */
  uploadImage?: UploadImageFn;
}

const PetFormModal: React.FC<PetFormModalProps> = ({
  isOpen,
  pet,
  onClose,
  onSubmit,
  uploadImage = (file: File) => apiService.uploadImage(file),
}) => {
  const [formData, setFormData] = useState<PetCreateData>({
    name: '',
    type: 'dog',
    breed: '',
    rescueId: '', // Will be set when submitting
    ageYears: 0,
    ageMonths: 0,
    gender: 'male',
    size: 'medium',
    color: '',
    adoptionFee: '',
    shortDescription: '',
    longDescription: '',
    specialNeeds: false,
    houseTrained: false,
    goodWithChildren: undefined,
    goodWithDogs: undefined,
    goodWithCats: undefined,
    energyLevel: 'medium',
    temperament: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Monotonically increasing id so each upload slot has a stable React key
  // across reorders / removals.
  const nextLocalIdRef = useRef(0);
  const allocateLocalId = (): string => {
    const id = `img-${nextLocalIdRef.current}`;
    nextLocalIdRef.current += 1;
    return id;
  };

  useEffect(() => {
    if (pet) {
      // Pet schema fields are optional because different API responses
      // return different subsets (lib.pets/src/schemas.ts:55-57). The
      // PetCreateData form fields that the rescue UI surfaces as
      // required selects (type / gender / size) need concrete defaults
      // when the API didn't include them; PetCreateData also requires
      // string-shaped name / breed / rescueId / color.
      setFormData({
        name: pet.name,
        type: pet.type ?? 'dog',
        breed: pet.breed ?? '',
        rescueId: pet.rescue_id ?? '',
        secondaryBreed: pet.secondary_breed,
        ageYears: pet.age_years,
        ageMonths: pet.age_months,
        gender: pet.gender ?? 'male',
        size: pet.size ?? 'medium',
        color: pet.color ?? '',
        markings: pet.markings,
        weightKg: pet.weight_kg,
        adoptionFee: pet.adoption_fee,
        shortDescription: pet.short_description,
        longDescription: pet.long_description,
        specialNeeds: pet.special_needs,
        specialNeedsDescription: pet.special_needs_description,
        houseTrained: pet.house_trained,
        goodWithChildren: pet.good_with_children,
        goodWithDogs: pet.good_with_dogs,
        goodWithCats: pet.good_with_cats,
        goodWithSmallAnimals: pet.good_with_small_animals,
        energyLevel: pet.energy_level,
        exerciseNeeds: pet.exercise_needs,
        groomingNeeds: pet.grooming_needs,
        temperament: pet.temperament,
        medicalNotes: pet.medical_notes,
        behavioralNotes: pet.behavioral_notes,
      });
      // Seed the uploader from the existing pet record so the editor can
      // reorder / remove existing photos. Pet.images carries an
      // order_index; we honour it via the array sort.
      const seeded: UploadedImage[] = (pet.images ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map(img => ({
          localId: allocateLocalId(),
          filename: img.url.split('/').pop() ?? img.url,
          status: 'uploaded' as const,
          url: img.url,
          thumbnailUrl: img.thumbnail_url,
        }));
      setImages(seeded);
    } else {
      setFormData({
        name: '',
        type: 'dog',
        breed: '',
        rescueId: '',
        ageYears: 0,
        ageMonths: 0,
        gender: 'male',
        size: 'medium',
        color: '',
        adoptionFee: '',
        shortDescription: '',
        longDescription: '',
        specialNeeds: false,
        houseTrained: false,
        goodWithChildren: undefined,
        goodWithDogs: undefined,
        goodWithCats: undefined,
        energyLevel: 'medium',
        temperament: [],
      });
      setImages([]);
    }
    setErrors({});
    setImageError(null);
  }, [pet, isOpen]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }) as typeof prev);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Pet name is required';
    }

    if (!formData.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }

    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    if (!formData.shortDescription?.trim()) {
      newErrors.shortDescription = 'Short description is required';
    }

    if (
      (formData.ageYears || 0) < 0 ||
      (formData.ageMonths || 0) < 0 ||
      (formData.ageMonths || 0) > 11
    ) {
      newErrors.age = 'Please enter a valid age';
    }

    // Adoption fee: optional, but if provided must be a non-negative number
    // with up to 2 decimal places. Mirrors AdoptionFeeStringSchema in
    // lib.pets so the form rejects "free", "£150", "tbd", etc. (ADS-578).
    const adoptionFeeRaw = (formData.adoptionFee ?? '').trim();
    if (adoptionFeeRaw !== '' && !/^\d+(\.\d{1,2})?$/.test(adoptionFeeRaw)) {
      newErrors.adoptionFee =
        'Adoption fee must be a non-negative number with up to 2 decimal places';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ADS-574: image upload helpers.
  //
  // Each selected file gets a placeholder UploadedImage in `uploading` state
  // appended synchronously. The upload runs asynchronously per-file (so a
  // failure on one doesn't block the others) and patches the matching row
  // by `localId` when it resolves. Submission only includes URLs from rows
  // in the `uploaded` state so in-flight or failed uploads never leak into
  // the create payload.
  const validateImageFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return `${file.name} is not a supported image type.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0);
      return `${file.name} is too large. Maximum size is ${mb}MB.`;
    }
    return null;
  };

  const startUpload = (localId: string, file: File) => {
    uploadImage(file)
      .then(response => {
        setImages(prev =>
          prev.map(img =>
            img.localId === localId
              ? {
                  ...img,
                  status: 'uploaded',
                  url: response.url,
                  thumbnailUrl: response.thumbnail_url,
                }
              : img
          )
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Upload failed.';
        setImages(prev =>
          prev.map(img =>
            img.localId === localId
              ? { ...img, status: 'error', errorMessage: `Upload failed: ${message}` }
              : img
          )
        );
      });
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    setImageError(null);
    if (!fileList || fileList.length === 0) {
      return;
    }
    const selected = Array.from(fileList);
    const remainingSlots = Math.max(0, MAX_IMAGES - images.length);
    const overflow = selected.length > remainingSlots;
    const toProcess = overflow ? selected.slice(0, remainingSlots) : selected;

    const newRows: UploadedImage[] = [];
    for (const file of toProcess) {
      const validation = validateImageFile(file);
      if (validation) {
        setImageError(validation);
        continue;
      }
      const localId = allocateLocalId();
      newRows.push({
        localId,
        filename: file.name,
        status: 'uploading',
      });
      startUpload(localId, file);
    }

    if (newRows.length > 0) {
      setImages(prev => [...prev, ...newRows]);
    }

    if (overflow) {
      setImageError(`You can attach a maximum of ${MAX_IMAGES} images per pet.`);
    }

    // Allow re-selecting the same file later (browsers won't refire change
    // for an identical FileList).
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (localId: string) => {
    setImages(prev => prev.filter(img => img.localId !== localId));
    setImageError(null);
  };

  const moveToPrimary = (localId: string) => {
    setImages(prev => {
      const idx = prev.findIndex(img => img.localId === localId);
      if (idx <= 0) {
        return prev;
      }
      const next = prev.slice();
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      return next;
    });
  };

  const reorderImages = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) {
      return;
    }
    setImages(prev => {
      if (from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Only finalised uploads contribute to the submit payload — uploading /
    // errored slots are dropped silently (the user sees them as not-yet-
    // attached in the preview).
    const imageUrls = images
      .filter(
        (img): img is UploadedImage & { url: string } =>
          img.status === 'uploaded' && typeof img.url === 'string'
      )
      .map(img => img.url);

    const payload: PetCreateData = {
      ...formData,
      images: imageUrls,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error('Error submitting pet form:', error);
      setErrors({ submit: 'Failed to save pet. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const remainingSlots = Math.max(0, MAX_IMAGES - images.length);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <Card className={styles.modalContent} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <h2>{pet ? 'Edit Pet' : 'Add New Pet'}</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup()}>
              <label htmlFor="name">Pet Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="Enter pet's name"
              />
              {errors.name && <div className="error">{errors.name}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="type">Pet Type *</label>
              <select
                id="type"
                value={formData.type}
                onChange={e => handleInputChange('type', e.target.value)}
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="rabbit">Rabbit</option>
                <option value="bird">Bird</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="breed">Primary Breed *</label>
              <input
                id="breed"
                type="text"
                value={formData.breed}
                onChange={e => handleInputChange('breed', e.target.value)}
                placeholder="Enter primary breed"
              />
              {errors.breed && <div className="error">{errors.breed}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="secondaryBreed">Secondary Breed</label>
              <input
                id="secondaryBreed"
                type="text"
                value={formData.secondaryBreed || ''}
                onChange={e => handleInputChange('secondaryBreed', e.target.value)}
                placeholder="Enter secondary breed (if mix)"
              />
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="ageYears">Age (Years)</label>
              <input
                id="ageYears"
                type="number"
                min="0"
                max="30"
                value={formData.ageYears}
                onChange={e => handleInputChange('ageYears', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="ageMonths">Age (Months)</label>
              <input
                id="ageMonths"
                type="number"
                min="0"
                max="11"
                value={formData.ageMonths}
                onChange={e => handleInputChange('ageMonths', parseInt(e.target.value) || 0)}
              />
              {errors.age && <div className="error">{errors.age}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="size">Size *</label>
              <select
                id="size"
                value={formData.size}
                onChange={e => handleInputChange('size', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra_large">Extra Large</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="color">Color *</label>
              <input
                id="color"
                type="text"
                value={formData.color}
                onChange={e => handleInputChange('color', e.target.value)}
                placeholder="Enter primary color"
              />
              {errors.color && <div className="error">{errors.color}</div>}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="adoptionFee">Adoption Fee</label>
              <div className={styles.currencyInputWrapper}>
                <span className={styles.currencyAdornment} aria-hidden="true">
                  £
                </span>
                <input
                  id="adoptionFee"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={formData.adoptionFee || ''}
                  onChange={e => handleInputChange('adoptionFee', e.target.value)}
                  placeholder="150.00"
                />
              </div>
              {errors.adoptionFee && <div className="error">{errors.adoptionFee}</div>}
            </div>

            <div className={styles.formGroup({ fullWidth: true })}>
              <label htmlFor="shortDescription">Short Description *</label>
              <textarea
                id="shortDescription"
                value={formData.shortDescription || ''}
                onChange={e => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief description for listings (1-2 sentences)"
                rows={2}
              />
              {errors.shortDescription && <div className="error">{errors.shortDescription}</div>}
            </div>

            <div className={styles.formGroup({ fullWidth: true })}>
              <label htmlFor="longDescription">Long Description</label>
              <textarea
                id="longDescription"
                value={formData.longDescription || ''}
                onChange={e => handleInputChange('longDescription', e.target.value)}
                placeholder="Detailed description of the pet's personality, history, and needs"
                rows={4}
              />
            </div>

            <div className={styles.formGroup({ fullWidth: true })}>
              <label htmlFor="petImages">Add Pet Photos</label>
              <input
                id="petImages"
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES}
                onChange={e => handleFilesSelected(e.target.files)}
                disabled={remainingSlots === 0}
              />
              <div className={styles.imageHelper}>
                {remainingSlots} of {MAX_IMAGES} slots remaining. First photo is the primary listing
                image — drag a photo to reorder or use &ldquo;Make primary&rdquo; to promote one.
              </div>
              {imageError && <div className="error">{imageError}</div>}

              {images.length > 0 && (
                <ul className={styles.imageList} aria-label="Attached pet photos">
                  {images.map((img, index) => {
                    const isPrimary = index === 0;
                    const previewSrc = img.thumbnailUrl ?? img.url;
                    return (
                      <li
                        key={img.localId}
                        className={styles.imageItem}
                        draggable={img.status === 'uploaded'}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={e => {
                          if (dragIndex === null) {
                            return;
                          }
                          e.preventDefault();
                        }}
                        onDrop={e => {
                          if (dragIndex === null) {
                            return;
                          }
                          e.preventDefault();
                          reorderImages(dragIndex, index);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                      >
                        <div className={styles.imageThumbWrapper}>
                          {previewSrc ? (
                            <img
                              className={styles.imageThumb}
                              src={previewSrc}
                              alt={img.filename}
                            />
                          ) : (
                            <div className={styles.imageThumbPlaceholder} aria-hidden="true" />
                          )}
                          {isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                        </div>
                        <div className={styles.imageMeta}>
                          <span className={styles.imageFilename} title={img.filename}>
                            {img.filename}
                          </span>
                          {img.status === 'uploading' && (
                            <span className={styles.imageStatus}>Uploading...</span>
                          )}
                          {img.status === 'error' && (
                            <span className={styles.imageStatusError}>
                              {img.errorMessage ?? 'Upload failed'}
                            </span>
                          )}
                        </div>
                        <div className={styles.imageActions}>
                          <button
                            type="button"
                            onClick={() => moveToPrimary(img.localId)}
                            disabled={isPrimary || img.status !== 'uploaded'}
                            aria-label={`Make primary: ${img.filename}`}
                          >
                            Make primary
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(img.localId)}
                            aria-label={`Remove image: ${img.filename}`}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="energyLevel">Energy Level</label>
              <select
                id="energyLevel"
                value={formData.energyLevel}
                onChange={e => handleInputChange('energyLevel', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="very_high">Very High</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="specialNeeds"
                  checked={formData.specialNeeds}
                  onChange={e => handleInputChange('specialNeeds', e.target.checked)}
                />
                <label htmlFor="specialNeeds">Special Needs</label>
              </div>
            </div>

            <div className={styles.formGroup()}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="houseTrained"
                  checked={formData.houseTrained}
                  onChange={e => handleInputChange('houseTrained', e.target.checked)}
                />
                <label htmlFor="houseTrained">House Trained</label>
              </div>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithChildren">Good with Children</label>
              <select
                id="goodWithChildren"
                value={
                  formData.goodWithChildren === null || formData.goodWithChildren === undefined
                    ? ''
                    : formData.goodWithChildren.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithChildren',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithDogs">Good with Dogs</label>
              <select
                id="goodWithDogs"
                value={
                  formData.goodWithDogs === null || formData.goodWithDogs === undefined
                    ? ''
                    : formData.goodWithDogs.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithDogs',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className={styles.formGroup()}>
              <label htmlFor="goodWithCats">Good with Cats</label>
              <select
                id="goodWithCats"
                value={
                  formData.goodWithCats === null || formData.goodWithCats === undefined
                    ? ''
                    : formData.goodWithCats.toString()
                }
                onChange={e =>
                  handleInputChange(
                    'goodWithCats',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                <option value="">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}

          <div className={styles.modalActions}>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : pet ? 'Update Pet' : 'Add Pet'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PetFormModal;
