import { describe, expect, it } from 'vitest';

import { GUID } from '../interface/lib/guid.js';

describe('GUID', () => {
  describe('get', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = GUID.get();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(GUID.get());
      }
      // All UUIDs should be unique
      expect(uuids.size).toBe(100);
    });

    it('should generate 36 character UUIDs', () => {
      const uuid = GUID.get();
      expect(uuid.length).toBe(36);
    });

    it('should contain version 4 identifier (4)', () => {
      const uuid = GUID.get();
      // The 13th character should be '4' for version 4
      expect(uuid.charAt(14)).toBe('4');
    });

    it('should contain variant identifier (8, 9, a, or b)', () => {
      const uuid = GUID.get();
      // The 17th character should be 8, 9, a, or b
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });
  });
});
