/**
 * Image-decode safety limits shared between the file-upload pipeline
 * and the storage providers. Kept in a standalone module with no
 * service-layer imports so consumers (e.g. LocalStorageProvider) can
 * import these constants without dragging in models or env validation.
 *
 * If you raise either limit, also update the decoder configs that pass
 * them to sharp's `limitInputPixels` option.
 */
export const MAX_IMAGE_DIMENSION = 8000;
export const MAX_IMAGE_PIXELS = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;
