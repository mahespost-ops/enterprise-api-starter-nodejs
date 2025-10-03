/**
 * Query Parameter Utilities Tests
 *
 * Test suite for query parameter parsing and validation utilities.
 * Covers filtering, sorting, field selection, pagination, and search.
 *
 * Following TDD: These tests are written first and should initially fail.
 */

import {
  parseFilterParams,
  parseSortParam,
  parseFieldsParam,
  parsePaginationParams,
  parseSearchParam,
  FilterOperator,
} from '../query-params';

describe('Query Parameter Utilities', () => {
  describe('parseFilterParams', () => {
    it('should parse simple equality filter', () => {
      const query = { 'filter[status]': 'active' };
      const result = parseFilterParams(query);

      expect(result).toEqual([
        {
          field: 'status',
          operator: FilterOperator.EQ,
          value: 'active',
        },
      ]);
    });

    it('should parse filter with explicit operator', () => {
      const query = { 'filter[age][gte]': '18' };
      const result = parseFilterParams(query);

      expect(result).toEqual([
        {
          field: 'age',
          operator: FilterOperator.GTE,
          value: '18',
        },
      ]);
    });

    it('should parse multiple filters', () => {
      const query = {
        'filter[status]': 'active',
        'filter[role][ne]': 'admin',
      };
      const result = parseFilterParams(query);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        field: 'status',
        operator: FilterOperator.EQ,
        value: 'active',
      });
      expect(result).toContainEqual({
        field: 'role',
        operator: FilterOperator.NE,
        value: 'admin',
      });
    });

    it('should parse IN operator with comma-separated values', () => {
      const query = { 'filter[status][in]': 'active,pending,suspended' };
      const result = parseFilterParams(query);

      expect(result).toEqual([
        {
          field: 'status',
          operator: FilterOperator.IN,
          value: ['active', 'pending', 'suspended'],
        },
      ]);
    });

    it('should parse NIN operator with comma-separated values', () => {
      const query = { 'filter[status][nin]': 'deleted,archived' };
      const result = parseFilterParams(query);

      expect(result).toEqual([
        {
          field: 'status',
          operator: FilterOperator.NIN,
          value: ['deleted', 'archived'],
        },
      ]);
    });

    it('should parse comparison operators', () => {
      const query = {
        'filter[age][gt]': '18',
        'filter[salary][lte]': '100000',
      };
      const result = parseFilterParams(query);

      expect(result).toContainEqual({
        field: 'age',
        operator: FilterOperator.GT,
        value: '18',
      });
      expect(result).toContainEqual({
        field: 'salary',
        operator: FilterOperator.LTE,
        value: '100000',
      });
    });

    it('should parse string operators', () => {
      const query = {
        'filter[email][contains]': '@example.com',
        'filter[name][startsWith]': 'John',
        'filter[domain][endsWith]': '.com',
      };
      const result = parseFilterParams(query);

      expect(result).toContainEqual({
        field: 'email',
        operator: FilterOperator.CONTAINS,
        value: '@example.com',
      });
      expect(result).toContainEqual({
        field: 'name',
        operator: FilterOperator.STARTS_WITH,
        value: 'John',
      });
      expect(result).toContainEqual({
        field: 'domain',
        operator: FilterOperator.ENDS_WITH,
        value: '.com',
      });
    });

    it('should parse EXISTS operator', () => {
      const query = { 'filter[deletedAt][exists]': 'false' };
      const result = parseFilterParams(query);

      expect(result).toEqual([
        {
          field: 'deletedAt',
          operator: FilterOperator.EXISTS,
          value: false,
        },
      ]);
    });

    it('should return empty array for no filters', () => {
      const query = {};
      const result = parseFilterParams(query);

      expect(result).toEqual([]);
    });

    it('should ignore non-filter parameters', () => {
      const query = {
        'filter[status]': 'active',
        limit: '20',
        sort: '-createdAt',
      };
      const result = parseFilterParams(query);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('status');
    });

    it('should throw error for invalid operator', () => {
      const query = { 'filter[status][invalid]': 'active' };

      expect(() => parseFilterParams(query)).toThrow('Invalid filter operator: invalid');
    });
  });

  describe('parseSortParam', () => {
    it('should parse single field ascending', () => {
      const sort = 'createdAt';
      const result = parseSortParam(sort);

      expect(result).toEqual([
        {
          field: 'createdAt',
          direction: 'ASC',
        },
      ]);
    });

    it('should parse single field descending', () => {
      const sort = '-createdAt';
      const result = parseSortParam(sort);

      expect(result).toEqual([
        {
          field: 'createdAt',
          direction: 'DESC',
        },
      ]);
    });

    it('should parse multiple fields', () => {
      const sort = 'status,-createdAt,name';
      const result = parseSortParam(sort);

      expect(result).toEqual([
        { field: 'status', direction: 'ASC' },
        { field: 'createdAt', direction: 'DESC' },
        { field: 'name', direction: 'ASC' },
      ]);
    });

    it('should handle + prefix for ascending', () => {
      const sort = '+createdAt';
      const result = parseSortParam(sort);

      expect(result).toEqual([
        {
          field: 'createdAt',
          direction: 'ASC',
        },
      ]);
    });

    it('should return empty array for undefined sort', () => {
      const result = parseSortParam(undefined);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = parseSortParam('');

      expect(result).toEqual([]);
    });

    it('should trim whitespace from field names', () => {
      const sort = ' status , -createdAt , name ';
      const result = parseSortParam(sort);

      expect(result).toEqual([
        { field: 'status', direction: 'ASC' },
        { field: 'createdAt', direction: 'DESC' },
        { field: 'name', direction: 'ASC' },
      ]);
    });
  });

  describe('parseFieldsParam', () => {
    it('should parse comma-separated fields', () => {
      const fields = 'id,email,name,status';
      const result = parseFieldsParam(fields);

      expect(result).toEqual(['id', 'email', 'name', 'status']);
    });

    it('should always include id field', () => {
      const fields = 'email,name';
      const result = parseFieldsParam(fields);

      expect(result).toContain('id');
      expect(result).toContain('email');
      expect(result).toContain('name');
    });

    it('should remove duplicates', () => {
      const fields = 'id,email,name,email,id';
      const result = parseFieldsParam(fields);

      expect(result).toEqual(['id', 'email', 'name']);
    });

    it('should trim whitespace from field names', () => {
      const fields = ' id , email , name ';
      const result = parseFieldsParam(fields);

      expect(result).toEqual(['id', 'email', 'name']);
    });

    it('should return undefined for undefined input', () => {
      const result = parseFieldsParam(undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = parseFieldsParam('');

      expect(result).toBeUndefined();
    });

    it('should filter out empty field names', () => {
      const fields = 'id,email,,name,';
      const result = parseFieldsParam(fields);

      expect(result).toEqual(['id', 'email', 'name']);
    });
  });

  describe('parsePaginationParams', () => {
    describe('offset-based pagination', () => {
      it('should parse limit and offset', () => {
        const query = { limit: '50', offset: '100' };
        const result = parsePaginationParams(query, 'offset');

        expect(result).toEqual({
          type: 'offset',
          limit: 50,
          offset: 100,
        });
      });

      it('should apply default values', () => {
        const query = {};
        const result = parsePaginationParams(query, 'offset');

        expect(result).toEqual({
          type: 'offset',
          limit: 20,
          offset: 0,
        });
      });

      it('should enforce minimum limit of 1', () => {
        const query = { limit: '0' };
        const result = parsePaginationParams(query, 'offset');

        expect(result.limit).toBe(1);
      });

      it('should enforce maximum limit of 100', () => {
        const query = { limit: '500' };
        const result = parsePaginationParams(query, 'offset');

        expect(result.limit).toBe(100);
      });

      it('should enforce minimum offset of 0', () => {
        const query = { offset: '-10' };
        const result = parsePaginationParams(query, 'offset');

        expect(result.type).toBe('offset');
        if (result.type === 'offset') {
          expect(result.offset).toBe(0);
        }
      });

      it('should handle invalid number strings', () => {
        const query = { limit: 'abc', offset: 'xyz' };
        const result = parsePaginationParams(query, 'offset');

        expect(result).toEqual({
          type: 'offset',
          limit: 20,
          offset: 0,
        });
      });
    });

    describe('cursor-based pagination', () => {
      it('should parse limit and cursor', () => {
        const cursor = 'eyJpZCI6IjEyMyIsInRzIjoxMjM0fQ=='; // {"id":"123","ts":1234}
        const query = { limit: '50', cursor };
        const result = parsePaginationParams(query, 'cursor');

        expect(result).toEqual({
          type: 'cursor',
          limit: 50,
          cursor,
        });
      });

      it('should apply default limit', () => {
        const query = {};
        const result = parsePaginationParams(query, 'cursor');

        expect(result).toEqual({
          type: 'cursor',
          limit: 20,
          cursor: undefined,
        });
      });

      it('should enforce limit bounds', () => {
        const query1 = { limit: '0' };
        const result1 = parsePaginationParams(query1, 'cursor');
        expect(result1.limit).toBe(1);

        const query2 = { limit: '500' };
        const result2 = parsePaginationParams(query2, 'cursor');
        expect(result2.limit).toBe(100);
      });

      it('should handle missing cursor', () => {
        const query = { limit: '25' };
        const result = parsePaginationParams(query, 'cursor');

        expect(result).toEqual({
          type: 'cursor',
          limit: 25,
          cursor: undefined,
        });
      });
    });
  });

  describe('parseSearchParam', () => {
    it('should parse search query', () => {
      const search = 'john doe';
      const result = parseSearchParam(search);

      expect(result).toBe('john doe');
    });

    it('should trim whitespace', () => {
      const search = '  john doe  ';
      const result = parseSearchParam(search);

      expect(result).toBe('john doe');
    });

    it('should return undefined for undefined input', () => {
      const result = parseSearchParam(undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = parseSearchParam('');

      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      const result = parseSearchParam('   ');

      expect(result).toBeUndefined();
    });

    it('should preserve special characters', () => {
      const search = 'user@example.com';
      const result = parseSearchParam(search);

      expect(result).toBe('user@example.com');
    });
  });
});
