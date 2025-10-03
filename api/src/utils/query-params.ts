/**
 * Query Parameter Utilities
 *
 * Utilities for parsing and validating standardized query parameters.
 * Supports filtering, sorting, field selection, pagination, and search.
 *
 * @see /api/docs/QUERY_PARAMETER_STANDARDS.md
 */

// ============================================================================
// Types and Enums
// ============================================================================

export enum FilterOperator {
  EQ = 'eq',
  NE = 'ne',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NIN = 'nin',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
  EXISTS = 'exists',
}

export interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: string | string[] | boolean;
}

export interface ParsedSort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export type PaginationParams =
  | {
      type: 'offset';
      limit: number;
      offset: number;
    }
  | {
      type: 'cursor';
      limit: number;
      cursor?: string;
    };

// ============================================================================
// Filter Parsing
// ============================================================================

const VALID_OPERATORS = Object.values(FilterOperator);

/**
 * Parse filter key to extract field and operator
 * Uses iterative parsing instead of regex to prevent ReDoS attacks
 *
 * @param key - Query parameter key
 * @returns Parsed filter info or null if not a filter param
 */
function parseFilterKey(key: string): { field: string; operator?: string } | null {
  // Must start with 'filter['
  if (!key.startsWith('filter[')) {
    return null;
  }

  // Remove 'filter[' prefix
  const remainder = key.substring(7);

  // Find the closing bracket for the field name
  const firstCloseBracket = remainder.indexOf(']');
  if (firstCloseBracket === -1) {
    return null; // Invalid format
  }

  const field = remainder.substring(0, firstCloseBracket);

  // Check if there's an operator part
  const afterField = remainder.substring(firstCloseBracket + 1);
  if (afterField === '') {
    // Simple format: filter[field]
    return { field };
  }

  // Check for operator format: [operator]
  if (afterField.startsWith('[') && afterField.endsWith(']')) {
    const operator = afterField.substring(1, afterField.length - 1);
    return { field, operator };
  }

  return null; // Invalid format
}

/**
 * Parse filter query parameters
 *
 * Supports patterns:
 * - filter[field]=value (defaults to eq operator)
 * - filter[field][operator]=value
 *
 * @param query - Express query object
 * @returns Array of parsed filters
 * @throws Error if invalid operator
 */
export function parseFilterParams(query: Record<string, any>): ParsedFilter[] {
  const filters: ParsedFilter[] = [];

  for (const [key, value] of Object.entries(query)) {
    const parsed = parseFilterKey(key);
    if (!parsed) continue;

    const { field, operator: operatorStr } = parsed;
    const operator = (operatorStr || 'eq') as FilterOperator;

    // Validate operator
    if (!VALID_OPERATORS.includes(operator)) {
      throw new Error(`Invalid filter operator: ${operatorStr}`);
    }

    // Parse value based on operator
    let parsedValue: string | string[] | boolean;

    if (operator === FilterOperator.IN || operator === FilterOperator.NIN) {
      // Split comma-separated values into array
      parsedValue = value.split(',').map((v: string) => v.trim());
    } else if (operator === FilterOperator.EXISTS) {
      // Convert string to boolean
      parsedValue = value === 'true' || value === true;
    } else {
      // Keep as string
      parsedValue = value;
    }

    filters.push({ field, operator, value: parsedValue });
  }

  return filters;
}

// ============================================================================
// Sort Parsing
// ============================================================================

/**
 * Parse sort query parameter
 *
 * Format: field1,-field2,field3
 * - Prefix with '-' for descending order
 * - No prefix or '+' for ascending order
 *
 * @param sort - Sort query string
 * @returns Array of parsed sort fields
 */
export function parseSortParam(sort?: string): ParsedSort[] {
  if (!sort || sort.trim() === '') {
    return [];
  }

  return sort
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field.length > 0)
    .map((field) => {
      if (field.startsWith('-')) {
        return {
          field: field.substring(1),
          direction: 'DESC' as const,
        };
      } else if (field.startsWith('+')) {
        return {
          field: field.substring(1),
          direction: 'ASC' as const,
        };
      } else {
        return {
          field,
          direction: 'ASC' as const,
        };
      }
    });
}

// ============================================================================
// Field Selection Parsing
// ============================================================================

/**
 * Parse fields query parameter
 *
 * Format: field1,field2,field3
 * Always includes 'id' field
 *
 * @param fields - Fields query string
 * @returns Array of field names or undefined if not specified
 */
export function parseFieldsParam(fields?: string): string[] | undefined {
  if (!fields || fields.trim() === '') {
    return undefined;
  }

  const fieldArray = fields
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field.length > 0);

  // Always include id
  if (!fieldArray.includes('id')) {
    fieldArray.unshift('id');
  }

  // Remove duplicates
  return Array.from(new Set(fieldArray));
}

// ============================================================================
// Pagination Parsing
// ============================================================================

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MIN_OFFSET = 0;

/**
 * Parse pagination query parameters
 *
 * @param query - Express query object
 * @param type - Pagination type ('offset' or 'cursor')
 * @returns Parsed pagination params
 */
export function parsePaginationParams(
  query: Record<string, any>,
  type: 'offset' | 'cursor'
): PaginationParams {
  const limitStr = query.limit;
  let limit = DEFAULT_LIMIT;

  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed)) {
      limit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, parsed));
    }
  }

  if (type === 'offset') {
    const offsetStr = query.offset;
    let offset = 0;

    if (offsetStr) {
      const parsed = parseInt(offsetStr, 10);
      if (!isNaN(parsed)) {
        offset = Math.max(MIN_OFFSET, parsed);
      }
    }

    return {
      type: 'offset',
      limit,
      offset,
    };
  } else {
    return {
      type: 'cursor',
      limit,
      cursor: query.cursor,
    };
  }
}

// ============================================================================
// Search Parsing
// ============================================================================

/**
 * Parse search query parameter
 *
 * @param search - Search query string
 * @returns Trimmed search string or undefined
 */
export function parseSearchParam(search?: string): string | undefined {
  if (!search || search.trim() === '') {
    return undefined;
  }

  return search.trim();
}
