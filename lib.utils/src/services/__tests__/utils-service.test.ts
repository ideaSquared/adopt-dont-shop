import { UtilsService } from '../utils-service';

describe('UtilsService', () => {
  let service: UtilsService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    service = new UtilsService({
      debug: false,
    });
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
      expect(config.timezone).toBe('UTC');
      expect(config.currency).toBe('USD');
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true, timezone: 'America/New_York' });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
      expect(config.timezone).toBe('America/New_York');
    });
  });

  describe('date and time utilities', () => {
    describe('formatDate', () => {
      it('should format date in default YYYY-MM-DD format', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        const result = service.formatDate(date);
        expect(result).toBe('2024-01-15');
      });

      it('should format date in ISO format', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        const result = service.formatDate(date, { format: 'ISO' });
        expect(result).toBe('2024-01-15T10:30:00.000Z');
      });

      it('should handle string dates', () => {
        const result = service.formatDate('2024-01-15');
        expect(result).toBe('2024-01-15');
      });

      it('should handle invalid dates', () => {
        const result = service.formatDate('invalid-date');
        expect(result).toBe('Invalid Date');
      });
    });

    describe('formatRelativeTime', () => {
      it('should return "just now" for recent times', () => {
        const now = new Date();
        const result = service.formatRelativeTime(now);
        expect(result).toBe('just now');
      });

      it('should format minutes ago', () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const result = service.formatRelativeTime(fiveMinutesAgo);
        expect(result).toBe('5 minutes ago');
      });

      it('should format hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const result = service.formatRelativeTime(twoHoursAgo);
        expect(result).toBe('2 hours ago');
      });

      it('should format days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const result = service.formatRelativeTime(threeDaysAgo);
        expect(result).toBe('3 days ago');
      });
    });

    describe('parseDate', () => {
      it('should parse valid date strings', () => {
        const result = service.parseDate('2024-01-15');
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2024);
      });

      it('should return null for invalid dates', () => {
        const result = service.parseDate('invalid-date');
        expect(result).toBeNull();
      });
    });

    describe('isBusinessHours', () => {
      it('should return true for weekday business hours', () => {
        const businessDay = new Date('2024-01-15T14:00:00'); // Monday 2 PM
        const result = service.isBusinessHours(businessDay);
        expect(result).toBe(true);
      });

      it('should return false for weekend', () => {
        const weekend = new Date('2024-01-14T14:00:00'); // Sunday 2 PM
        const result = service.isBusinessHours(weekend);
        expect(result).toBe(false);
      });

      it('should return false for after hours', () => {
        const afterHours = new Date('2024-01-15T20:00:00'); // Monday 8 PM
        const result = service.isBusinessHours(afterHours);
        expect(result).toBe(false);
      });
    });
  });

  describe('string utilities', () => {
    describe('slugify', () => {
      it('should create URL-safe slugs', () => {
        const result = service.slugify('Hello World!');
        expect(result).toBe('hello-world');
      });

      it('should handle special characters', () => {
        const result = service.slugify('Hello & World @ 2024!');
        expect(result).toBe('hello-world-2024');
      });

      it('should limit length', () => {
        const result = service.slugify('This is a very long string that should be truncated', {
          maxLength: 20,
        });
        expect(result.length).toBeLessThanOrEqual(20);
      });
    });

    describe('truncate', () => {
      it('should truncate long text', () => {
        const text = 'This is a very long sentence that needs to be truncated';
        const result = service.truncate(text, { length: 20 });
        expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
        expect(result).toContain('...');
      });

      it('should preserve words when requested', () => {
        const text = 'This is a very long sentence';
        const result = service.truncate(text, { length: 10, preserveWords: true });
        expect(result).toBe('This is a...');
        expect(result).not.toContain('ver'); // Shouldn't cut mid-word
      });

      it('should not truncate short text', () => {
        const text = 'Short text';
        const result = service.truncate(text, { length: 20 });
        expect(result).toBe(text);
      });
    });

    describe('sanitizeInput', () => {
      it('should escape HTML characters', () => {
        const input = '<script>alert("xss")</script>';
        const result = service.sanitizeInput(input);
        expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      });

      it('should handle quotes and apostrophes', () => {
        const input = `It's a "test" string`;
        const result = service.sanitizeInput(input);
        expect(result).toBe(`It&#x27;s a &quot;test&quot; string`);
      });
    });

    describe('generateId', () => {
      it('should generate IDs of specified length', () => {
        const result = service.generateId({ length: 12 });
        expect(result.length).toBe(12);
      });

      it('should include prefix and suffix', () => {
        const result = service.generateId({ prefix: 'test_', suffix: '_end', length: 8 });
        expect(result).toMatch(/^test_.{8}_end$/);
      });

      it('should generate unique IDs', () => {
        const id1 = service.generateId();
        const id2 = service.generateId();
        expect(id1).not.toBe(id2);
      });
    });

    describe('capitalizeWords', () => {
      it('should capitalize first letter of each word', () => {
        const result = service.capitalizeWords('hello world test');
        expect(result).toBe('Hello World Test');
      });

      it('should handle single words', () => {
        const result = service.capitalizeWords('hello');
        expect(result).toBe('Hello');
      });
    });
  });

  describe('data transformation utilities', () => {
    describe('deepClone', () => {
      it('should clone objects deeply', () => {
        const original = { a: 1, b: { c: 2, d: [3, 4] } };
        const cloned = service.deepClone(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
        expect(cloned.b.d).not.toBe(original.b.d);
      });

      it('should clone arrays', () => {
        const original = [1, 2, { a: 3 }];
        const cloned = service.deepClone(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[2]).not.toBe(original[2]);
      });

      it('should clone dates', () => {
        const date = new Date();
        const cloned = service.deepClone(date);

        expect(cloned).toEqual(date);
        expect(cloned).not.toBe(date);
      });
    });

    describe('mergeObjects', () => {
      it('should merge multiple objects', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { b: 3, c: 4 };

        const result = service.mergeObjects(obj1, obj2);
        expect(result).toEqual({ a: 1, b: 3, c: 4 });
      });
    });

    describe('flattenObject', () => {
      it('should flatten nested objects', () => {
        const nested = { a: 1, b: { c: 2, d: { e: 3 } } };
        const result = service.flattenObject(nested);

        expect(result).toEqual({
          a: 1,
          'b.c': 2,
          'b.d.e': 3,
        });
      });

      it('should handle custom delimiters', () => {
        const nested = { a: { b: 1 } };
        const result = service.flattenObject(nested, { delimiter: '_' });

        expect(result).toEqual({ a_b: 1 });
      });
    });

    describe('unflattenObject', () => {
      it('should unflatten flattened objects', () => {
        const flattened = { 'a.b.c': 1, 'a.b.d': 2, 'a.e': 3 };
        const result = service.unflattenObject(flattened);

        expect(result).toEqual({
          a: {
            b: { c: 1, d: 2 },
            e: 3,
          },
        });
      });
    });

    describe('arrayToMap', () => {
      it('should convert array to map', () => {
        const array = [
          { id: '1', name: 'John' },
          { id: '2', name: 'Jane' },
        ];

        const result = service.arrayToMap(array, { keyField: 'id' });

        expect(result.get('1')).toEqual({ id: '1', name: 'John' });
        expect(result.get('2')).toEqual({ id: '2', name: 'Jane' });
      });

      it('should use custom value field', () => {
        const array = [{ id: '1', name: 'John' }];
        const result = service.arrayToMap(array, { keyField: 'id', valueField: 'name' });

        expect(result.get('1')).toBe('John');
      });
    });
  });

  describe('validation utilities', () => {
    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        const result = service.isValidEmail('test@example.com');
        expect(result.isValid).toBe(true);
        expect(result.normalizedValue).toBe('test@example.com');
      });

      it('should reject invalid emails', () => {
        const result = service.isValidEmail('invalid-email');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid email format');
      });
    });

    describe('isValidPhone', () => {
      it('should validate correct phone numbers', () => {
        const result = service.isValidPhone('(555) 123-4567');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        const result = service.isValidPhone('123');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid phone number format');
      });
    });

    describe('isValidURL', () => {
      it('should validate correct URLs', () => {
        const result = service.isValidURL('https://example.com');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid URLs', () => {
        const result = service.isValidURL('not-a-url');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid URL format');
      });
    });

    describe('validateFileType', () => {
      it('should validate allowed file types', () => {
        const result = service.validateFileType('image.jpg');
        expect(result.isValid).toBe(true);
      });

      it('should reject disallowed file types', () => {
        const result = service.validateFileType('file.exe', {
          allowedExtensions: ['.jpg', '.png'],
        });
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File type not allowed');
      });
    });
  });

  describe('formatting utilities', () => {
    describe('formatCurrency', () => {
      it('should format currency with default USD', () => {
        const result = service.formatCurrency(1234.56);
        expect(result).toMatch(/\$1,234\.56/);
      });

      it('should handle different currencies', () => {
        const result = service.formatCurrency(1234.56, { currency: 'EUR' });
        expect(result).toContain('1,234.56');
      });
    });

    describe('formatFileSize', () => {
      it('should format bytes correctly', () => {
        expect(service.formatFileSize(0)).toBe('0 Bytes');
        expect(service.formatFileSize(1024)).toBe('1 KB');
        expect(service.formatFileSize(1048576)).toBe('1 MB');
        expect(service.formatFileSize(1073741824)).toBe('1 GB');
      });
    });

    describe('formatPhoneNumber', () => {
      it('should format 10-digit numbers', () => {
        const result = service.formatPhoneNumber('5551234567');
        expect(result).toBe('(555) 123-4567');
      });

      it('should format 11-digit numbers with country code', () => {
        const result = service.formatPhoneNumber('15551234567');
        expect(result).toBe('+1 (555) 123-4567');
      });

      it('should return original for unformattable numbers', () => {
        const result = service.formatPhoneNumber('123');
        expect(result).toBe('123');
      });
    });

    describe('formatAddress', () => {
      it('should format complete addresses', () => {
        const address = {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
        };

        const result = service.formatAddress(address);
        expect(result).toBe('123 Main St, Anytown, CA, 12345');
      });

      it('should handle partial addresses', () => {
        const address = { city: 'Anytown', state: 'CA' };
        const result = service.formatAddress(address);
        expect(result).toBe('Anytown, CA');
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when all utilities work', async () => {
      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when utilities fail', async () => {
      // Mock a failure
      const originalFormatDate = service.formatDate;
      service.formatDate = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await service.healthCheck();
      expect(result).toBe(false);

      // Restore
      service.formatDate = originalFormatDate;
    });
  });
});

