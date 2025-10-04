/**
 * HTTP Constants
 * Headers, content types, and other HTTP-related values
 */

export const HTTP_HEADERS = {
  AUTHORIZATION: 'authorization',
  USER_AGENT: 'user-agent',
  CONTENT_TYPE: 'content-type',
  ACCEPT: 'accept',
} as const;

export const TOKEN_PREFIX = {
  BEARER: 'Bearer ',
} as const;
