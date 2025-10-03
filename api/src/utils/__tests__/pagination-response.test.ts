/**
 * Pagination Response Tests
 *
 * Test suite for pagination response formatting utilities.
 * Tests both offset-based and cursor-based pagination responses.
 *
 * Following TDD: These tests are written first and should initially fail.
 */

import {
  formatOffsetPaginationResponse,
  formatCursorPaginationResponse,
  encodeCursor,
  decodeCursor,
} from '../pagination-response';

describe('Pagination Response Utilities', () => {
  describe('formatOffsetPaginationResponse', () => {
    it('should format basic offset pagination response', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const limit = 20;
      const offset = 0;
      const total = 50;

      const result = formatOffsetPaginationResponse(data, limit, offset, total);

      expect(result).toEqual({
        data,
        pagination: {
          limit: 20,
          offset: 0,
          total: 50,
          hasMore: true,
        },
      });
    });

    it('should set hasMore to false when on last page', () => {
      // When offset + data length = total, there's no more data
      const data = Array(10)
        .fill(null)
        .map((_, i) => ({ id: 40 + i }));
      const limit = 20;
      const offset = 40;
      const total = 50;

      const result = formatOffsetPaginationResponse(data, limit, offset, total);

      expect(result.pagination.hasMore).toBe(false);
    });

    it('should set hasMore to false when no more data', () => {
      const data = [{ id: 1 }];
      const limit = 20;
      const offset = 0;
      const total = 1;

      const result = formatOffsetPaginationResponse(data, limit, offset, total);

      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const limit = 20;
      const offset = 0;
      const total = 0;

      const result = formatOffsetPaginationResponse(data, limit, offset, total);

      expect(result).toEqual({
        data: [],
        pagination: {
          limit: 20,
          offset: 0,
          total: 0,
          hasMore: false,
        },
      });
    });

    it('should calculate hasMore correctly at page boundaries', () => {
      // Exactly at page boundary
      const data1 = Array(20).fill({ id: 1 });
      const result1 = formatOffsetPaginationResponse(data1, 20, 0, 40);
      expect(result1.pagination.hasMore).toBe(true);

      // One less than limit
      const data2 = Array(19).fill({ id: 1 });
      const result2 = formatOffsetPaginationResponse(data2, 20, 0, 19);
      expect(result2.pagination.hasMore).toBe(false);
    });
  });

  describe('formatCursorPaginationResponse', () => {
    it('should format basic cursor pagination response with next cursor', () => {
      const data = [
        { id: '1', createdAt: new Date('2025-01-01') },
        { id: '2', createdAt: new Date('2025-01-02') },
      ];
      const limit = 20;
      const hasMore = true;
      const sortFields = [{ field: 'createdAt', direction: 'DESC' as const }];

      const result = formatCursorPaginationResponse(data, limit, hasMore, sortFields);

      expect(result.data).toEqual(data);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBeDefined();
      expect(typeof result.pagination.nextCursor).toBe('string');
    });

    it('should not include nextCursor when hasMore is false', () => {
      const data = [{ id: '1', createdAt: new Date('2025-01-01') }];
      const limit = 20;
      const hasMore = false;
      const sortFields = [{ field: 'createdAt', direction: 'DESC' as const }];

      const result = formatCursorPaginationResponse(data, limit, hasMore, sortFields);

      expect(result.pagination.nextCursor).toBeUndefined();
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const limit = 20;
      const hasMore = false;
      const sortFields = [{ field: 'createdAt', direction: 'DESC' as const }];

      const result = formatCursorPaginationResponse(data, limit, hasMore, sortFields);

      expect(result).toEqual({
        data: [],
        pagination: {
          limit: 20,
          hasMore: false,
        },
      });
    });

    it('should encode cursor with multiple sort fields', () => {
      const data = [
        { id: '1', status: 'active', createdAt: new Date('2025-01-01') },
        { id: '2', status: 'inactive', createdAt: new Date('2025-01-02') },
      ];
      const limit = 20;
      const hasMore = true;
      const sortFields = [
        { field: 'status', direction: 'ASC' as const },
        { field: 'createdAt', direction: 'DESC' as const },
      ];

      const result = formatCursorPaginationResponse(data, limit, hasMore, sortFields);

      expect(result.pagination.nextCursor).toBeDefined();

      // Verify cursor can be decoded
      const decoded = decodeCursor(result.pagination.nextCursor!);
      expect(decoded.id).toBe('2');
      expect(decoded.status).toBe('inactive');
    });
  });

  describe('encodeCursor', () => {
    it('should encode cursor values to base64', () => {
      const values = {
        id: '123',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      };

      const cursor = encodeCursor(values);

      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);
    });

    it('should handle multiple fields', () => {
      const values = {
        id: '123',
        status: 'active',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        score: 95,
      };

      const cursor = encodeCursor(values);

      expect(cursor).toBeDefined();
      const decoded = decodeCursor(cursor);
      expect(decoded.id).toBe('123');
      expect(decoded.status).toBe('active');
      expect(decoded.score).toBe(95);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-01-01T12:00:00.000Z');
      const values = { id: '123', timestamp: date };

      const cursor = encodeCursor(values);
      const decoded = decodeCursor(cursor);

      expect(decoded.timestamp).toEqual(date.toISOString());
    });

    it('should handle null values', () => {
      const values = { id: '123', deletedAt: null };

      const cursor = encodeCursor(values);
      const decoded = decodeCursor(cursor);

      expect(decoded.deletedAt).toBeNull();
    });
  });

  describe('decodeCursor', () => {
    it('should decode base64 cursor', () => {
      const original = { id: '123', createdAt: '2025-01-01T00:00:00.000Z' };
      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(original);
    });

    it('should throw error for invalid base64', () => {
      const invalidCursor = 'not-valid-base64!!!';

      expect(() => decodeCursor(invalidCursor)).toThrow();
    });

    it('should throw error for non-JSON content', () => {
      const invalidJson = Buffer.from('not json').toString('base64');

      expect(() => decodeCursor(invalidJson)).toThrow();
    });

    it('should handle complex nested structures', () => {
      const original = {
        id: '123',
        metadata: { key: 'value' },
        tags: ['tag1', 'tag2'],
      };
      const encoded = encodeCursor(original);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(original);
    });
  });

  describe('cursor round-trip', () => {
    it('should maintain data integrity through encode/decode cycle', () => {
      const testCases = [
        { id: '1', timestamp: new Date('2025-01-01').toISOString() },
        { id: '2', status: 'active', score: 100 },
        { id: '3', name: 'Test', active: true, count: 0 },
        { id: '4', value: null },
      ];

      testCases.forEach((original) => {
        const encoded = encodeCursor(original);
        const decoded = decodeCursor(encoded);
        expect(decoded).toEqual(original);
      });
    });
  });
});
