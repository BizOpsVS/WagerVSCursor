/**
 * Utility functions for converting between MySQL BINARY(16) and UUID strings
 * MySQL stores UUIDs as BINARY(16) for better performance
 */

/**
 * Convert UUID string to Buffer for Prisma BINARY(16)
 * @param uuid - UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @returns Buffer containing the UUID bytes
 */
export const uuidToBuffer = (uuid: string): Buffer => {
  const hex = uuid.replace(/-/g, '');
  return Buffer.from(hex, 'hex');
};

/**
 * Convert Buffer (BINARY(16)) to UUID string
 * @param buffer - Buffer containing UUID bytes
 * @returns UUID string with hyphens
 */
export const bufferToUuid = (buffer: Buffer): string => {
  const hex = buffer.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
};

/**
 * Generate a new UUID and return as Buffer
 * @returns Buffer containing new UUID bytes
 */
export const generateUuidBuffer = (): Buffer => {
  const { randomUUID } = require('crypto');
  const uuid = randomUUID();
  return uuidToBuffer(uuid);
};

/**
 * Generate a new UUID string
 * @returns UUID string
 */
export const generateUuid = (): string => {
  const { randomUUID } = require('crypto');
  return randomUUID();
};

