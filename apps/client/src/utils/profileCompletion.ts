import type { User } from '@adopt-dont-shop/lib.auth';

/**
 * ADS-629: profile completion metric used by the discover meter and
 * (future) backend Pawfect Match badge gating.
 *
 * Field weights are deliberately bucketed into four equal sections so
 * the UI meter can render four clickable segments that deep-link to
 * the relevant settings group. If the segment count changes, update
 * `PROFILE_COMPLETION_SECTIONS` and the matching JSX in
 * `ProfileCompletionMeter.tsx` together.
 *
 * `Pawfect Match` server-side gating (the AC's third bullet) needs the
 * backend to reproject this calculation. Until that lands, the client
 * meter and the existing `getMatchTier` consume the same util, so the
 * surfaces stay consistent for the cohort that's logged in.
 */

export type ProfileCompletionSection = {
  key: 'basics' | 'location' | 'profile' | 'preferences';
  label: string;
  deepLink: string;
  isComplete: (user: User | null | undefined) => boolean;
};

const trimmed = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export const PROFILE_COMPLETION_SECTIONS: ProfileCompletionSection[] = [
  {
    key: 'basics',
    label: 'Basics',
    deepLink: '/profile/edit?section=basics',
    isComplete: user =>
      Boolean(user) && trimmed(user?.firstName) && trimmed(user?.lastName) && trimmed(user?.email),
  },
  {
    key: 'location',
    label: 'Location',
    deepLink: '/profile/edit?section=location',
    isComplete: user => Boolean(user) && trimmed(user?.city) && trimmed(user?.country),
  },
  {
    key: 'profile',
    label: 'About you',
    deepLink: '/profile/edit?section=profile',
    isComplete: user => Boolean(user) && trimmed(user?.bio) && trimmed(user?.profileImageUrl),
  },
  {
    key: 'preferences',
    label: 'Preferences',
    deepLink: '/profile/settings#preferences',
    isComplete: user => {
      const prefs = user?.preferences;
      if (!prefs) {
        return false;
      }
      const petTypesSet = Array.isArray(prefs.petTypes) && prefs.petTypes.length > 0;
      const distanceSet = typeof prefs.maxDistance === 'number' && prefs.maxDistance > 0;
      return petTypesSet && distanceSet;
    },
  },
];

export type ProfileCompletionResult = {
  percent: number;
  completedSections: ProfileCompletionSection['key'][];
  incompleteSections: ProfileCompletionSection['key'][];
};

export const calculateProfileCompletion = (
  user: User | null | undefined
): ProfileCompletionResult => {
  const total = PROFILE_COMPLETION_SECTIONS.length;
  const completedSections: ProfileCompletionSection['key'][] = [];
  const incompleteSections: ProfileCompletionSection['key'][] = [];

  for (const section of PROFILE_COMPLETION_SECTIONS) {
    if (section.isComplete(user)) {
      completedSections.push(section.key);
    } else {
      incompleteSections.push(section.key);
    }
  }

  const percent = Math.round((completedSections.length / total) * 100);
  return { percent, completedSections, incompleteSections };
};

export const PAWFECT_MATCH_PROFILE_THRESHOLD_PERCENT = 80;

export const PROFILE_METER_DISMISSED_STORAGE_KEY = 'profile_meter.dismissed_session';
export const PROFILE_METER_CELEBRATED_STORAGE_KEY = 'profile_meter.celebrated';
