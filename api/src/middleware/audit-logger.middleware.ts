/**
 * Audit Logger Middleware
 *
 * Captures HTTP request/response metadata for event logging.
 * Executes AFTER response is sent to client (non-blocking).
 *
 * Key Features:
 * - Registers res.on('finish') listener for post-response capture
 * - O(1) EventType lookup from cache
 * - Non-blocking emission to EventProcessor
 * - Extracts context from req.user, req.orgId, req.envId
 *
 * Middleware Order:
 * Request ID → Auth → Audit Logger → Routes → Response → Event Captured
 */

import { Request, Response, NextFunction } from 'express';
import { eventTypeCacheService } from '../services/event-type-cache.service';
import { eventProcessorService } from '../services/event-processor.service';
import logger from '../config/logger';
import type { EventData, RequestSnapshot, ResponseSnapshot, EventContext } from '../types/event.types';
import { redactRequestSnapshot } from '../utils/event.helpers';

/**
 * Audit logger middleware
 * Captures API requests for event logging after response sent
 */
export const auditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Capture request snapshot before handler executes
  const requestSnapshot: RequestSnapshot = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
  };

  // Redact sensitive data (authorization tokens, passwords, etc.)
  const redactedSnapshot = redactRequestSnapshot(requestSnapshot);

  // Register listener for when response finishes (after client receives response)
  res.on('finish', () => {
    try {
      const duration = Date.now() - startTime;

      // Lookup EventType from cache (O(1))
      const eventType = eventTypeCacheService.getEventType(req.method, req.path);

      // Skip if no EventType configured for this endpoint
      if (!eventType) {
        logger.debug('No event type configured for endpoint', {
          method: req.method,
          path: req.path,
        });
        return;
      }

      // Build response snapshot
      const responseSnapshot: ResponseSnapshot = {
        statusCode: res.statusCode,
        duration,
      };

      // Extract context from request (attached by auth middleware)
      const context: EventContext = {
        userId: req.user?.sub,
        orgId: req.user?.orgId,
        envId: req.user?.envId,
        orgName: undefined, // TODO: Add to JWT or lookup from cache
        envName: undefined, // TODO: Add to JWT or lookup from cache
        impersonation: req.user?.impersonation ? {
          impersonatorId: req.user.impersonation.originalUserId,
          impersonatorEmail: '', // TODO: Lookup from user
          impersonatedAt: new Date(req.user.impersonation.impersonationChain[0]?.startedAt || Date.now()),
        } : null,
        requestId: req.id || 'unknown',
      };

      // Build event data (use redacted snapshot for security)
      const eventData: EventData = {
        eventType,
        request: redactedSnapshot,
        response: responseSnapshot,
        context,
      };

      // Emit event to processor (non-blocking)
      eventProcessorService.emit('api-request', eventData);

      logger.debug('Event emitted to processor', {
        verb: eventType.verb,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } catch (error) {
      // Log error but don't fail the request (already sent to client)
      logger.error('Error capturing event in audit logger', {
        error,
        method: req.method,
        path: req.path,
      });
    }
  });

  // Pass control to next middleware/controller immediately (non-blocking)
  next();
};

export default auditLogger;
