// Feature flags for the application
export const FEATURES = {
  PDF_VIEWER_ENABLED: false, // Set to true to enable PDF preview
  IMAGE_LIGHTBOX_ENABLED: true,
  CHAT_ATTACHMENTS_ENABLED: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;
