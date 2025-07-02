import FeatureFlag from '../models/FeatureFlag';

const featureFlags = [
  {
    name: 'enable_video_chat',
    description: 'Enable video chat functionality in the application',
    enabled: false,
  },
  {
    name: 'enable_ai_pet_matching',
    description: 'Enable AI-powered pet matching recommendations',
    enabled: true,
  },
  {
    name: 'enable_payment_processing',
    description: 'Enable payment processing for adoption fees',
    enabled: false,
  },
  {
    name: 'enable_social_sharing',
    description: 'Enable social media sharing of pet profiles',
    enabled: true,
  },
  {
    name: 'enable_advanced_search',
    description: 'Enable advanced search filters for pet listings',
    enabled: true,
  },
  {
    name: 'enable_mobile_app_api',
    description: 'Enable mobile app API endpoints',
    enabled: true,
  },
  {
    name: 'enable_email_notifications',
    description: 'Enable email notification system',
    enabled: true,
  },
  {
    name: 'enable_push_notifications',
    description: 'Enable push notifications for mobile',
    enabled: false,
  },
  {
    name: 'enable_application_auto_approval',
    description: 'Enable automatic approval for certain applications',
    enabled: false,
  },
  {
    name: 'enable_rescue_verification',
    description: 'Enable rescue organization verification process',
    enabled: true,
  },
];

export async function seedFeatureFlags() {
  for (const flagData of featureFlags) {
    await FeatureFlag.findOrCreate({
      where: { name: flagData.name },
      defaults: {
        ...flagData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${featureFlags.length} feature flags`);
}
