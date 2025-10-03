/**
 * Pagination Response Utilities
 *
 * Utilities for formatting paginated API responses.
 * Supports both offset-based and cursor-based pagination.
 *
 * @see /api/docs/QUERY_PARAMETER_STANDARDS.md
 */

import { ParsedSort } from './query-params';

// ============================================================================
// Types
// ============================================================================

export interface OffsetPaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface CursorPaginationInfo {
  limit: number;
  nextCursor?: string;
  hasMore: boolean;
}

export interface OffsetPaginationResponse<T> {
  data: T[];
  pagination: OffsetPaginationInfo;
}

export interface CursorPaginationResponse<T> {
  data: T[];
  pagination: CursorPaginationInfo;
}

// ============================================================================
// Offset Pagination Response
// ============================================================================

/**
 * Format offset-based pagination response
 *
 * @param data - Array of data items
 * @param limit - Number of items per page
 * @param offset - Number of items skipped
 * @param total - Total number of items
 * @returns Formatted response with pagination metadata
 */
export function formatOffsetPaginationResponse<T>(
  data: T[],
  limit: number,
  offset: number,
  total: number
): OffsetPaginationResponse<T> {
  const hasMore = offset + data.length < total;

  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore,
    },
  };
}

// ============================================================================
// Cursor Pagination Response
// ============================================================================

/**
 * Format cursor-based pagination response
 *
 * @param data - Array of data items
 * @param limit - Number of items per page
 * @param hasMore - Whether there are more items available
 * @param sortFields - Sort fields used for cursor generation
 * @returns Formatted response with pagination metadata
 */
export function formatCursorPaginationResponse<T extends Record<string, any>>(
  data: T[],
  limit: number,
  hasMore: boolean,
  sortFields: ParsedSort[]
): CursorPaginationResponse<T> {
  const pagination: CursorPaginationInfo = {
    limit,
    hasMore,
  };

  // Generate next cursor if there's more data
  if (hasMore && data.length > 0) {
    const lastItem = data[data.length - 1];
    const cursorValues: Record<string, any> = { id: lastItem.id };

    // Include sort field values in cursor
    for (const sort of sortFields) {
      cursorValues[sort.field] = lastItem[sort.field];
    }

    pagination.nextCursor = encodeCursor(cursorValues);
  }

  return {
    data,
    pagination,
  };
}

// ============================================================================
// Cursor Encoding/Decoding
// ============================================================================

/**
 * Encode cursor values to base64
 *
 * @param values - Cursor field values
 * @returns Base64-encoded cursor string
 */
export function encodeCursor(values: Record<string, any>): string {
  // Convert dates to ISO strings for JSON serialization
  const serializable: Record<string, any> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value instanceof Date) {
      serializable[key] = value.toISOString();
    } else {
      serializable[key] = value;
    }
  }

  const json = JSON.stringify(serializable);
  return Buffer.from(json).toString('base64');
}

/**
 * Decode cursor from base64
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded cursor values
 * @throws Error if cursor is invalid
 */
export function decodeCursor(cursor: string): Record<string, any> {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}
