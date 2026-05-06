import { logger } from '../utils/logger';

const BASE_URL = 'https://api.company-information.service.gov.uk';

// SIC codes associated with animal welfare, rescue, and veterinary activities.
// Sources: UK SIC 2007 classification, ONS supplementary list.
const ANIMAL_RELATED_SIC_CODES = new Set([
  '01490', // Other animal farming
  '01500', // Mixed farming (includes animal)
  '75000', // Veterinary activities
  '94990', // Activities of other membership organisations n.e.c. (covers many animal charities)
  '96090', // Other personal service activities n.e.c. (covers many rescue orgs)
  '99000', // Activities of extraterritorial organisations and bodies
  '01410', // Raising of dairy cattle
  '01420', // Raising of other cattle and buffaloes
  '01430', // Raising of horses and other equines
  '01440', // Raising of camels and camelids
  '01450', // Raising of sheep and goats
  '01460', // Raising of swine/pigs
  '01470', // Raising of poultry
]);

// Keywords to match against company name when SIC codes are inconclusive.
const ANIMAL_KEYWORDS = [
  'animal',
  'rescue',
  'rehome',
  'rehoming',
  'sanctuary',
  'welfare',
  'veterinary',
  'vet',
  'paws',
  'feline',
  'canine',
  'dogs trust',
  'cats protection',
  'rspca',
  'rspb',
  'pdsa',
  'wildlife',
  'bird',
  'rabbit',
  'horse',
  'equine',
  'farm animal',
  'shelter',
];

type CompanyStatus =
  | 'active'
  | 'dissolved'
  | 'liquidation'
  | 'receivership'
  | 'converted-closed'
  | 'voluntary-arrangement'
  | 'insolvency-proceedings'
  | 'administration'
  | 'registered'
  | 'removed';

type CompaniesHouseCompany = {
  company_status: CompanyStatus;
  company_name: string;
  sic_codes?: string[];
};

export type CompaniesHouseResult =
  | { verified: true; companyName: string }
  | { verified: false; reason: string };

// Per-request fetch timeout. Companies House response times are sub-second in
// the steady state; a 5s ceiling absorbs incident-period latency without
// pinning DB connections (ADS-368).
const REQUEST_TIMEOUT_MS = 5_000;

// Hard cap on total wall-clock time across retries. With REQUEST_TIMEOUT_MS=5s
// and up to 3 attempts the worst case is 5+1+5+2+5 = 18s — too long. This
// budget is the absolute upper bound; the retry loop bails as soon as it's
// exceeded so the verification helper can never take longer than this.
const TOTAL_BUDGET_MS = 7_000;

const isAnimalRelated = (company: CompaniesHouseCompany): boolean => {
  if (company.sic_codes?.some(code => ANIMAL_RELATED_SIC_CODES.has(code))) {
    return true;
  }
  const nameLower = company.company_name.toLowerCase();
  return ANIMAL_KEYWORDS.some(kw => nameLower.includes(kw));
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

class TimeoutError extends Error {
  constructor() {
    super('Companies House API timeout');
    this.name = 'TimeoutError';
  }
}

/**
 * `fetch` with a per-request timeout. Composes the caller-supplied abort
 * signal (the wall-clock budget) with a per-request `AbortSignal.timeout`
 * so whichever fires first wins.
 */
const fetchWithTimeout = async (
  url: string,
  apiKey: string,
  budgetSignal: AbortSignal
): Promise<Response> => {
  const requestSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([requestSignal, budgetSignal]);
  return fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
    signal,
  });
};

/**
 * Fetches the URL, retrying on HTTP 429 with exponential backoff. Bails early
 * if the wall-clock budget is exhausted. Throws TimeoutError when either the
 * per-request or total-budget signal fires.
 */
const fetchWithRetry = async (
  url: string,
  apiKey: string,
  budgetSignal: AbortSignal
): Promise<Response> => {
  let attempt = 0;
  // Bail conditions are explicit at the bottom of the loop body. ESLint's
  // no-constant-condition rule is overly cautious here.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (budgetSignal.aborted) {
      throw new TimeoutError();
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(url, apiKey, budgetSignal);
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

export const verifyCompaniesHouseNumber = async (number: string): Promise<CompaniesHouseResult> => {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    logger.warn('COMPANIES_HOUSE_API_KEY not set — skipping Companies House verification');
    return { verified: false, reason: 'Companies House API key not configured' };
  }

  const budgetSignal = AbortSignal.timeout(TOTAL_BUDGET_MS);

  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/company/${encodeURIComponent(number)}`,
      apiKey,
      budgetSignal
    );

    if (res.status === 404) {
      return { verified: false, reason: `No company found with number ${number}` };
    }

    if (!res.ok) {
      logger.error('Companies House API error', { status: res.status, number });
      return { verified: false, reason: `Companies House API returned status ${res.status}` };
    }

    const company = (await res.json()) as CompaniesHouseCompany;

    if (company.company_status !== 'active') {
      return {
        verified: false,
        reason: `Company is not active (status: ${company.company_status})`,
      };
    }

    if (!isAnimalRelated(company)) {
      return {
        verified: false,
        reason:
          'Company does not appear to be animal or rescue related based on SIC codes and name',
      };
    }

    return { verified: true, companyName: company.company_name };
  } catch (error) {
    if (error instanceof TimeoutError || isAbortError(error)) {
      logger.warn('Companies House verification timed out', { number });
      return { verified: false, reason: 'Companies House API timeout' };
    }
    logger.error('Companies House verification failed', { error, number });
    return { verified: false, reason: 'Failed to contact Companies House API' };
  }
};
