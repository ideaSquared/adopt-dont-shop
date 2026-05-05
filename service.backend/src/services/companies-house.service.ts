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

const isAnimalRelated = (company: CompaniesHouseCompany): boolean => {
  if (company.sic_codes?.some(code => ANIMAL_RELATED_SIC_CODES.has(code))) {
    return true;
  }
  const nameLower = company.company_name.toLowerCase();
  return ANIMAL_KEYWORDS.some(kw => nameLower.includes(kw));
};

const fetchWithRetry = async (url: string, apiKey: string, attempt = 0): Promise<Response> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
    },
  });

  if (res.status === 429 && attempt < 3) {
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, apiKey, attempt + 1);
  }

  return res;
};

export const verifyCompaniesHouseNumber = async (number: string): Promise<CompaniesHouseResult> => {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    logger.warn('COMPANIES_HOUSE_API_KEY not set — skipping Companies House verification');
    return { verified: false, reason: 'Companies House API key not configured' };
  }

  try {
    const res = await fetchWithRetry(`${BASE_URL}/company/${encodeURIComponent(number)}`, apiKey);

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
    logger.error('Companies House verification failed', { error, number });
    return { verified: false, reason: 'Failed to contact Companies House API' };
  }
};
