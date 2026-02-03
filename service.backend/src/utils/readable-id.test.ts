import { generateReadableId } from './readable-id';

describe('generateReadableId', () => {
  describe('ID format validation', () => {
    it('should generate ID with correct prefix format', () => {
      const id = generateReadableId('pet');
      expect(id).toMatch(/^pet_0000[a-z0-9]{8}$/);
    });

    it('should generate user ID with correct format', () => {
      const id = generateReadableId('user');
      expect(id).toMatch(/^user_0000[a-z0-9]{8}$/);
    });

    it('should generate rescue ID with correct format', () => {
      const id = generateReadableId('rescue');
      expect(id).toMatch(/^rescue_0000[a-z0-9]{8}$/);
    });

    it('should generate application ID with correct format', () => {
      const id = generateReadableId('application');
      expect(id).toMatch(/^application_0000[a-z0-9]{8}$/);
    });

    it('should generate chat ID with correct format', () => {
      const id = generateReadableId('chat');
      expect(id).toMatch(/^chat_0000[a-z0-9]{8}$/);
    });

    it('should generate message ID with correct format', () => {
      const id = generateReadableId('message');
      expect(id).toMatch(/^message_0000[a-z0-9]{8}$/);
    });
  });

  describe('ID uniqueness', () => {
    it('should generate unique IDs on subsequent calls', () => {
      const id1 = generateReadableId('pet');
      const id2 = generateReadableId('pet');
      const id3 = generateReadableId('pet');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate 1000 unique IDs without collision', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateReadableId('pet'));
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('ID length consistency', () => {
    it('should always generate IDs with consistent length for same prefix', () => {
      const id1 = generateReadableId('pet');
      const id2 = generateReadableId('pet');
      const id3 = generateReadableId('pet');

      expect(id1.length).toBe(id2.length);
      expect(id2.length).toBe(id3.length);
    });

    it('should generate pet ID with length 16 (pet_0000 + 8 chars)', () => {
      const id = generateReadableId('pet');
      // 'pet_0000' = 8 chars + 8 random chars = 16 total
      expect(id.length).toBe(16);
    });

    it('should generate user ID with length 17 (user_0000 + 8 chars)', () => {
      const id = generateReadableId('user');
      // 'user_0000' = 9 chars + 8 random chars = 17 total
      expect(id.length).toBe(17);
    });

    it('should generate application ID with length 24 (application_0000 + 8 chars)', () => {
      const id = generateReadableId('application');
      // 'application_0000' = 16 chars + 8 random chars = 24 total
      expect(id.length).toBe(24);
    });
  });

  describe('Character set validation', () => {
    it('should only use lowercase alphanumeric characters in random part', () => {
      const id = generateReadableId('pet');
      const randomPart = id.split('_0000')[1];

      expect(randomPart).toMatch(/^[a-z0-9]+$/);
      expect(randomPart).not.toMatch(/[A-Z]/);
      expect(randomPart).not.toMatch(/[^a-z0-9]/);
    });

    it('should generate IDs that are safe for URLs', () => {
      const id = generateReadableId('pet');

      // Should not contain characters that need URL encoding
      expect(id).not.toContain(' ');
      expect(id).not.toContain('/');
      expect(id).not.toContain('?');
      expect(id).not.toContain('&');
      expect(id).not.toContain('=');
    });
  });

  describe('Prefix handling', () => {
    it('should handle custom prefixes', () => {
      const id = generateReadableId('custom');
      expect(id).toMatch(/^custom_0000[a-z0-9]{8}$/);
    });

    it('should handle long prefixes', () => {
      const id = generateReadableId('verylongprefix');
      expect(id).toMatch(/^verylongprefix_0000[a-z0-9]{8}$/);
    });
  });

  describe('Statistical distribution', () => {
    it('should generate reasonably distributed random characters', () => {
      const chars = new Set<string>();

      // Generate 100 IDs and collect all random characters
      for (let i = 0; i < 100; i++) {
        const id = generateReadableId('test');
        const randomPart = id.split('_0000')[1];
        randomPart.split('').forEach(char => chars.add(char));
      }

      // Should have good variety of characters (at least 15 different chars from base36)
      expect(chars.size).toBeGreaterThanOrEqual(15);
    });
  });
});
