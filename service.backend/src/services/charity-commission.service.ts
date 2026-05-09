import { logger } from '../utils/logger';

const BASE_URL = 'https://api.charitycommission.gov.uk/register/api';

// Keywords to check against charity objects/activities text.
// Erring on the side of inclusion — ambiguous cases fall through to manual review.
const ANIMAL_KEYWORDS = [
  'animal',
  'rescue',
  'rehom',
  'sanctuary',
  'welfare',
  'wildlife',
  'veterinary',
  'vet ',
  'paws',
  'feline',
  'canine',
  'dog',
  'cat',
  'rabbit',
  'horse',
  'equine',
  'bird',
  'farm animal',
  'pet',
  'shelter',
  'pound',
  'stray',
];

type CharityRegistrationStatus = 'registered' | 'removed' | 'revoked';

type CharityDetails = {
  charity_registration_status: CharityRegistrationStatus;
  charity_name: string;
  charity_activities?: string;
  charity_object?: string;
};

export type CharityCommissionResult =
  | { verified: true; charityName: string }
  | { verified: false; reason: string };

// See companies-house.service.ts for the rationale on these constants.
const REQUEST_TIMEOUT_MS = 5_000;
const TOTAL_BUDGET_MS = 7_000;

const isAnimalRelated = (charity: CharityDetails): boolean => {
  const text = [
    charity.charity_name,
    charity.charity_activities ?? '',
    charity.charity_object ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return ANIMAL_KEYWORDS.some(kw => text.includes(kw));
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

class TimeoutError extends Error {
  constructor() {
    super('Charity Commission API timeout');
    this.name = 'TimeoutError';
  }
}

const fetchWithTimeout = async (
  url: string,
  subscriptionKey: string,
  budgetSignal: AbortSignal
): Promise<Response> => {
  const requestSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([requestSignal, budgetSignal]);
  return fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey },
    signal,
  });
};

const fetchWithRetry = async (
  url: string,
  subscriptionKey: string,
  budgetSignal: AbortSignal
): Promise<Response> => {
  let attempt = 0;
  // Bail conditions are explicit at the bottom of the loop body. ESLint's
  // no-constant-condition rule is overly cautious here.

  while (true) {
    if (budgetSignal.aborted) {
      throw new TimeoutError();
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(url, subscriptionKey, budgetSignal);
    } catch (error) {
      if (isAbortError(error)) {
        throw new TimeoutError();
      }
      throw error;
    }

    if (res.status !== 429 || attempt >= 3) {
      return res;
    }

    const delay = Math.pow(2, attempt) * 1000;
    if (budgetSignal.aborted) {
      throw new TimeoutError();
    }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, delay);
      budgetSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(new TimeoutError());
        },
        { once: true }
      );
    });
    attempt += 1;
  }
};

// Strip the sub-charity suffix for the API lookup (e.g. "1234567-1" → "1234567").
const baseRegistrationNumber = (number: string): string => number.split('-')[0];

export const verifyCharityRegistrationNumber = async (
  number: string
): Promise<CharityCommissionResult> => {
  const subscriptionKey = process.env.CHARITY_COMMISSION_API_KEY;
  if (!subscriptionKey) {
    logger.warn('CHARITY_COMMISSION_API_KEY not set — skipping Charity Commission verification');
    return { verified: false, reason: 'Charity Commission API key not configured' };
  }

  const regno = baseRegistrationNumber(number);
  const budgetSignal = AbortSignal.timeout(TOTAL_BUDGET_MS);

  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/allcharitydetails/${encodeURIComponent(regno)}/0`,
      subscriptionKey,
      budgetSignal
    );

    if (res.status === 404) {
      return { verified: false, reason: `No charity found with registration number ${number}` };
    }

    if (!res.ok) {
      logger.error('Charity Commission API error', { status: res.status, number });
      return {
        verified: false,
        reason: `Charity Commission API returned status ${res.status}`,
      };
    }

    const charity = (await res.json()) as CharityDetails;

    if (charity.charity_registration_status !== 'registered') {
      return {
        verified: false,
        reason: `Charity is not registered (status: ${charity.charity_registration_status})`,
      };
    }

    if (!isAnimalRelated(charity)) {
      return {
        verified: false,
        reason:
          'Charity objects and activities do not appear to be animal or rescue related — please contact us for manual verification',
      };
    }

    return { verified: true, charityName: charity.charity_name };
  } catch (error) {
    if (error instanceof TimeoutError || isAbortError(error)) {
      logger.warn('Charity Commission verification timed out', { number });
      return { verified: false, reason: 'Charity Commission API timeout' };
    }
    logger.error('Charity Commission verification failed', { error, number });
    return { verified: false, reason: 'Failed to contact Charity Commission API' };
  }
};
