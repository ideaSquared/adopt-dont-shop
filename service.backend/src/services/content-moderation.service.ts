import { logger } from '../utils/logger';

export enum ScanSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MessageModerationStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export type ScanResult = {
  isFlagged: boolean;
  severity: ScanSeverity | null;
  reason: string | null;
  matchedCategories: string[];
};

type PatternRule = {
  label: string;
  patterns: RegExp[];
};

// Rules ordered from most severe to least — first match wins
const SEVERITY_RULES: Array<{ severity: ScanSeverity } & PatternRule> = [
  {
    severity: ScanSeverity.CRITICAL,
    label: 'animal_trafficking_or_abuse',
    patterns: [
      /\b(sell|selling|buy|buying|purchase|purchasing)\s+(a\s+)?(dog|puppy|puppies|kitten|kittens|cat|cats|animal|pet|breed|litter)\s+(for|at)\s+\$?\d+/i,
      /\b(animal|pet)\s+(abuse|cruelty|harm|torture|kill|killing)\b/i,
      /\bwire\s+transfer\b.*\b(dog|puppy|cat|kitten|pet|animal)\b/i,
      /\b(dog|puppy|cat|kitten|pet|animal)\b.*\bwire\s+transfer\b/i,
      /\bwestern\s+union\b/i,
      /\bmoney\s+gram\b/i,
    ],
  },
  {
    severity: ScanSeverity.HIGH,
    label: 'financial_fraud_or_threats',
    patterns: [
      /\b(send|transfer|pay|wire)\s+(me\s+)?\$?\d{2,}/i,
      /\b(advance\s+fee|upfront\s+payment|shipping\s+fee|insurance\s+fee)\b/i,
      /\b(gift\s+card|bitcoin|crypto|cryptocurrency|paypal\s+me|venmo\s+me|cash\s+app)\b/i,
      /\b(i('ll|\s+will)\s+(hurt|harm|kill|find|come\s+after|destroy))\s+you\b/i,
      /\b(know\s+where\s+you\s+live|come\s+to\s+your\s+(house|home|address))\b/i,
      /\b(credit\s+card\s+number|bank\s+account\s+number|routing\s+number|social\s+security\s+number|ssn)\b/i,
    ],
  },
  {
    severity: ScanSeverity.MEDIUM,
    label: 'spam_or_harassment',
    patterns: [
      /\b(click\s+here\s+to|free\s+(offer|gift|prize)|you\s+have\s+won|claim\s+your)\b/i,
      /\b(idiot|moron|stupid|dumb|loser|worthless|trash|garbage)\b/i,
      /\b(scam(mer)?|fraud(ster)?|liar|cheater|thief)\b/i,
      /https?:\/\/(?!adopt-dont-shop\.com|localhost)/i, // External links other than the platform
    ],
  },
  {
    severity: ScanSeverity.LOW,
    label: 'off_platform_contact',
    patterns: [
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone number pattern
      /\b(call|text|reach)\s+me\s+at\b/i,
      /\b(my\s+email\s+is|email\s+me\s+at|contact\s+me\s+at)\b/i,
      /\b(whatsapp|telegram|signal|snapchat|instagram|facebook)\s+(me|us|number)\b/i,
    ],
  },
];

export class ContentModerationService {
  /**
   * Scan message content for policy violations.
   * Returns the first (highest severity) match found.
   */
  static scanContent(content: string): ScanResult {
    for (const rule of SEVERITY_RULES) {
      const matched = rule.patterns.some(pattern => pattern.test(content));
      if (matched) {
        logger.debug('Content flagged by moderation scanner', {
          severity: rule.severity,
          category: rule.label,
          contentLength: content.length,
        });

        return {
          isFlagged: true,
          severity: rule.severity,
          reason: rule.label,
          matchedCategories: [rule.label],
        };
      }
    }

    return {
      isFlagged: false,
      severity: null,
      reason: null,
      matchedCategories: [],
    };
  }

  /**
   * Returns true when the message should be blocked entirely (not stored).
   * Only CRITICAL severity warrants an outright block.
   */
  static isMessageBlocked(scanResult: ScanResult): boolean {
    return scanResult.isFlagged && scanResult.severity === ScanSeverity.CRITICAL;
  }

  /**
   * Returns true when a Report should be automatically created.
   * HIGH and CRITICAL violations warrant automatic escalation.
   */
  static shouldAutoReport(scanResult: ScanResult): boolean {
    return (
      scanResult.isFlagged &&
      (scanResult.severity === ScanSeverity.HIGH || scanResult.severity === ScanSeverity.CRITICAL)
    );
  }
}
