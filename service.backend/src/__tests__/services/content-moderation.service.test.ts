import { describe, it, expect } from 'vitest';
import {
  ContentModerationService,
  ScanSeverity,
} from '../../services/content-moderation.service';

describe('ContentModerationService', () => {
  describe('scanContent', () => {
    describe('when content is clean', () => {
      it('should return not flagged for normal adoption enquiry messages', () => {
        const result = ContentModerationService.scanContent(
          'Hello, I am interested in adopting Max. Can we arrange a meet?'
        );

        expect(result.isFlagged).toBe(false);
        expect(result.severity).toBeNull();
        expect(result.reason).toBeNull();
      });

      it('should not flag adoption-related pet discussions', () => {
        const result = ContentModerationService.scanContent(
          'We are happy to arrange a home visit before the adoption is finalised.'
        );

        expect(result.isFlagged).toBe(false);
      });
    });

    describe('CRITICAL severity — animal trafficking and abuse', () => {
      it('should flag selling a pet for money', () => {
        const result = ContentModerationService.scanContent(
          'I am selling a puppy for $500'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.CRITICAL);
        expect(result.reason).toBe('animal_trafficking_or_abuse');
      });

      it('should flag wire transfer requests involving animals', () => {
        const result = ContentModerationService.scanContent(
          'Please wire transfer the money for the dog'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.CRITICAL);
      });

      it('should flag Western Union mentions', () => {
        const result = ContentModerationService.scanContent(
          'Send payment via Western Union'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.CRITICAL);
      });

      it('should flag animal abuse mentions', () => {
        const result = ContentModerationService.scanContent(
          'animal cruelty is being reported here'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.CRITICAL);
      });
    });

    describe('HIGH severity — financial fraud and threats', () => {
      it('should flag requests to send money', () => {
        const result = ContentModerationService.scanContent(
          'Please send me $200 to cover the shipping costs'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.HIGH);
        expect(result.reason).toBe('financial_fraud_or_threats');
      });

      it('should flag bitcoin payment requests', () => {
        const result = ContentModerationService.scanContent(
          'Pay using bitcoin and I will send the pet'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.HIGH);
      });

      it('should flag advance fee mentions', () => {
        const result = ContentModerationService.scanContent(
          'I need an advance fee payment before delivery'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.HIGH);
      });

      it('should flag threats of physical harm', () => {
        const result = ContentModerationService.scanContent(
          "I'll hurt you if you don't comply"
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.HIGH);
      });

      it('should flag requests for bank account details', () => {
        const result = ContentModerationService.scanContent(
          'Please share your bank account number for the refund'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.HIGH);
      });
    });

    describe('MEDIUM severity — spam and harassment', () => {
      it('should flag harassment language', () => {
        const result = ContentModerationService.scanContent(
          'You are a complete idiot for not accepting my application'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.MEDIUM);
        expect(result.reason).toBe('spam_or_harassment');
      });

      it('should flag scammer accusations', () => {
        const result = ContentModerationService.scanContent(
          'You are a scammer, I know it'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.MEDIUM);
      });

      it('should flag external links', () => {
        const result = ContentModerationService.scanContent(
          'Check out http://externalsite.com for more info'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.MEDIUM);
      });
    });

    describe('LOW severity — off-platform contact attempts', () => {
      it('should flag phone number sharing', () => {
        const result = ContentModerationService.scanContent(
          'Call me at 555-123-4567 anytime'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.LOW);
        expect(result.reason).toBe('off_platform_contact');
      });

      it('should flag email sharing', () => {
        const result = ContentModerationService.scanContent(
          'My email is john@example.com, please contact me at'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.LOW);
      });

      it('should flag WhatsApp contact attempts', () => {
        const result = ContentModerationService.scanContent(
          'Message me on WhatsApp me for details'
        );

        expect(result.isFlagged).toBe(true);
        expect(result.severity).toBe(ScanSeverity.LOW);
      });
    });

    describe('severity ordering — highest severity wins', () => {
      it('should return CRITICAL even when lower-severity patterns also match', () => {
        const result = ContentModerationService.scanContent(
          'Send $200 via Western Union for the puppy'
        );

        expect(result.severity).toBe(ScanSeverity.CRITICAL);
      });
    });
  });

  describe('isMessageBlocked', () => {
    it('should return true only for CRITICAL severity', () => {
      expect(
        ContentModerationService.isMessageBlocked({
          isFlagged: true,
          severity: ScanSeverity.CRITICAL,
          reason: 'animal_trafficking_or_abuse',
          matchedCategories: ['animal_trafficking_or_abuse'],
        })
      ).toBe(true);
    });

    it('should return false for HIGH severity', () => {
      expect(
        ContentModerationService.isMessageBlocked({
          isFlagged: true,
          severity: ScanSeverity.HIGH,
          reason: 'financial_fraud_or_threats',
          matchedCategories: ['financial_fraud_or_threats'],
        })
      ).toBe(false);
    });

    it('should return false for clean messages', () => {
      expect(
        ContentModerationService.isMessageBlocked({
          isFlagged: false,
          severity: null,
          reason: null,
          matchedCategories: [],
        })
      ).toBe(false);
    });
  });

  describe('shouldAutoReport', () => {
    it('should return true for CRITICAL violations', () => {
      expect(
        ContentModerationService.shouldAutoReport({
          isFlagged: true,
          severity: ScanSeverity.CRITICAL,
          reason: 'animal_trafficking_or_abuse',
          matchedCategories: [],
        })
      ).toBe(true);
    });

    it('should return true for HIGH violations', () => {
      expect(
        ContentModerationService.shouldAutoReport({
          isFlagged: true,
          severity: ScanSeverity.HIGH,
          reason: 'financial_fraud_or_threats',
          matchedCategories: [],
        })
      ).toBe(true);
    });

    it('should return false for MEDIUM violations', () => {
      expect(
        ContentModerationService.shouldAutoReport({
          isFlagged: true,
          severity: ScanSeverity.MEDIUM,
          reason: 'spam_or_harassment',
          matchedCategories: [],
        })
      ).toBe(false);
    });

    it('should return false for LOW violations', () => {
      expect(
        ContentModerationService.shouldAutoReport({
          isFlagged: true,
          severity: ScanSeverity.LOW,
          reason: 'off_platform_contact',
          matchedCategories: [],
        })
      ).toBe(false);
    });

    it('should return false for clean messages', () => {
      expect(
        ContentModerationService.shouldAutoReport({
          isFlagged: false,
          severity: null,
          reason: null,
          matchedCategories: [],
        })
      ).toBe(false);
    });
  });
});
