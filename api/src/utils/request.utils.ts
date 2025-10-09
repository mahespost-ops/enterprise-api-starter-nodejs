/**
 * Request Utility Functions
 * Helpers for extracting information from HTTP requests
 */

import { type Request } from 'express';
import { UAParser } from 'ua-parser-js';
import { NETWORK_DEFAULTS } from '../constants/network.constants';
import type { DeviceType } from '../models/Device.model';

/**
 * Extract real client IP address from request headers
 * Handles X-Forwarded-For, X-Real-IP, and direct connection IP
 *
 * Security considerations:
 * - X-Forwarded-For can contain a chain of IPs (client, proxy1, proxy2, ...)
 * - Leftmost IP is the original client (but can be spoofed if not behind trusted proxy)
 * - In production behind load balancer/proxy, use the first IP in X-Forwarded-For
 * - Fall back to X-Real-IP or direct connection IP
 *
 * @param req - Express request object
 * @returns Client IP address
 */
export function extractClientIP(req: Request): string {
  // Check X-Forwarded-For header (standard for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list: "client, proxy1, proxy2"
    // The leftmost (first) IP is the original client
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const clientIp = ips.split(',')[0].trim();
    if (clientIp && clientIp !== 'unknown') {
      return clientIp;
    }
  }

  // Check X-Real-IP header (alternative used by some proxies like nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp !== 'unknown') {
    return realIp;
  }

  // Fall back to direct connection IP (req.ip from Express)
  // Note: This works correctly with Express trust proxy setting
  if (req.ip && req.ip !== 'unknown') {
    return req.ip;
  }

  // Last resort: socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Default if all else fails
  return NETWORK_DEFAULTS.LOCALHOST_IP;
}

/**
 * Extract User-Agent string from request headers
 *
 * @param req - Express request object
 * @returns User-Agent string or undefined
 */
export function extractUserAgent(req: Request): string | undefined {
  const userAgent = req.headers['user-agent'];
  return typeof userAgent === 'string' ? userAgent : undefined;
}

/**
 * Parse User-Agent string to extract device information
 * Uses ua-parser-js for robust parsing
 *
 * @param userAgent - User-Agent string
 * @returns Parsed device information (deviceType, browser, os, etc.)
 */
export function parseUserAgent(userAgent?: string): {
  deviceType: DeviceType;
  browser: string;
  browserVersion: string | undefined;
  os: string;
  osVersion: string | undefined;
} {
  if (!userAgent) {
    return {
      deviceType: 'unknown',
      browser: 'unknown',
      browserVersion: undefined,
      os: 'unknown',
      osVersion: undefined,
    };
  }

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();

  // Determine device type: mobile, tablet, or desktop
  let deviceType: DeviceType = 'desktop';
  if (device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (device.type === 'tablet') {
    deviceType = 'tablet';
  }

  return {
    deviceType,
    browser: browser.name || 'unknown',
    browserVersion: browser.version,
    os: os.name || 'unknown',
    osVersion: os.version,
  };
}

/**
 * Check if request is from a mobile device
 * Uses ua-parser-js for accurate detection
 *
 * @param userAgent - User-Agent string
 * @returns True if mobile device detected
 */
export function isMobileDevice(userAgent?: string): boolean {
  if (!userAgent) {
    return false;
  }

  const parsed = parseUserAgent(userAgent);
  return parsed.deviceType === 'mobile' || parsed.deviceType === 'tablet';
}
