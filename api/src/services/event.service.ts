/**
 * Event Service
 * Business logic for event-related operations (read-only)
 *
 * Events are system-generated logs, not user-created resources.
 * This service provides read-only access with cursor pagination for high-volume queries.
 */

import { Event } from '../models/Event.model';
import { OrganizationMember } from '../models/OrganizationMember.model';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';
import logger from '../config/logger';

interface ListEventsOptions {
  limit?: number;
  cursor?: string;
  verb?: string;
  actorType?: 'User' | 'System';
  webhookOnly?: boolean;
  fields?: string[];
}

class EventService {
  /**
   * Verify user has access to environment
   * @param orgId - Organization UUID
   * @param userId - User UUID
   * @throws ForbiddenError if user is not a member
   */
  private async verifyOrganizationAccess(orgId: string, userId: string): Promise<void> {
    // Check if user is a member of the organization
    const membership = await OrganizationMember.findOne({
      where: {
        organizationId: orgId,
        userId: userId,
      },
    });

    if (!membership) {
      logger.warn(`User ${userId} is not a member of organization ${orgId}`);
      throw new ForbiddenError(ERROR_MESSAGES.NOT_ORGANIZATION_MEMBER);
    }
  }

  /**
   * List events for an environment (cursor pagination)
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param userId - User UUID (for access check)
   * @param options - Filter and pagination options
   * @returns Events with cursor pagination metadata
   */
  async listEvents(
    orgId: string,
    envId: string,
    userId: string,
    options: ListEventsOptions
  ): Promise<{ data: Event[] | Record<string, unknown>[]; pagination: { limit: number; nextCursor?: string; hasMore: boolean } }> {
    logger.debug(`Listing events for environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const { limit = 100, cursor, verb, actorType, webhookOnly, fields } = options;

    // Use model's cursor pagination method
    const result = await Event.findWithCursor(envId, {
      limit,
      cursor,
      verb,
      actorType,
      webhookOnly,
    });

    // Apply field selection if needed
    let data: Event[] | Record<string, unknown>[] = result.data;
    if (fields && fields.length > 0) {
      // Field selection: only return specified fields plus id
      data = result.data.map((event) => {
        const selected: Record<string, unknown> = { id: event.id };
        fields.forEach((field) => {
          if (field in event) {
            selected[field] = event[field as keyof Event];
          }
        });
        return selected;
      });
    }

    logger.debug(`Retrieved ${data.length} events (hasMore: ${result.hasMore})`);

    return {
      data,
      pagination: {
        limit,
        nextCursor: result.nextCursor || undefined,
        hasMore: result.hasMore,
      },
    };
  }

  /**
   * Get event by ID
   * @param orgId - Organization UUID
   * @param envId - Environment UUID
   * @param eventId - Event UUID
   * @param userId - User UUID (for access check)
   * @returns Event object
   * @throws NotFoundError if event not found
   */
  async getEvent(orgId: string, envId: string, eventId: string, userId: string): Promise<Event> {
    logger.debug(`Getting event: ${eventId} in environment: ${envId}`);

    // Verify user has access to organization
    await this.verifyOrganizationAccess(orgId, userId);

    const event = await Event.findByPk(eventId);

    if (!event || event.environmentId !== envId) {
      logger.warn(`Event not found: ${eventId} in environment: ${envId}`);
      throw new NotFoundError(ERROR_MESSAGES.EVENT_NOT_FOUND);
    }

    logger.debug(`Event retrieved: ${eventId}`);
    return event;
  }
}

export default new EventService();
