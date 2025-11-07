import { uuidToBuffer, bufferToUuid, generateUuid } from '../uuid';

describe('UUID Utilities', () => {
  const testUuid = '550e8400-e29b-41d4-a716-446655440000';
  
  describe('uuidToBuffer', () => {
    it('should convert UUID string to Buffer', () => {
      const buffer = uuidToBuffer(testUuid);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16);
    });
  });

  describe('bufferToUuid', () => {
    it('should convert Buffer to UUID string', () => {
      const buffer = uuidToBuffer(testUuid);
      const uuid = bufferToUuid(buffer);
      expect(uuid).toBe(testUuid);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain UUID integrity through conversions', () => {
      const originalUuid = generateUuid();
      const buffer = uuidToBuffer(originalUuid);
      const convertedUuid = bufferToUuid(buffer);
      expect(convertedUuid).toBe(originalUuid);
    });
  });

  describe('generateUuid', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUuid();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

