/**
 * Event Model
 * W3C Open Social Activity Streams compliant event logging
 * Designed for 100M+ records with cursor pagination support
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

// Event attributes
export interface EventAttributes {
  id: string;
  environmentId: string;
  verb: string;
  actorType: 'User' | 'System';
  actor: Record<string, unknown>;
  object: Record<string, unknown>;
  target: Record<string, unknown> | null;
  audit: Record<string, unknown> | null;
  description: string | null;
  timestamp: Date;
  organizationId: string;
  organizationName: string;
  environmentName: string;
  isWebhookEvent: boolean;
}

// Optional fields for creation
export interface EventCreationAttributes
  extends Optional<
    EventAttributes,
    'id' | 'target' | 'audit' | 'description' | 'timestamp' | 'organizationName' | 'environmentName' | 'isWebhookEvent'
  > {}

/**
 * Event Model Class
 */
export class Event extends Model<EventAttributes, EventCreationAttributes> implements EventAttributes {
  declare id: string;
  declare environmentId: string;
  declare verb: string;
  declare actorType: 'User' | 'System';
  declare actor: Record<string, unknown>;
  declare object: Record<string, unknown>;
  declare target: Record<string, unknown> | null;
  declare audit: Record<string, unknown> | null;
  declare description: string | null;
  declare timestamp: Date;
  declare organizationId: string;
  declare organizationName: string;
  declare environmentName: string;
  declare isWebhookEvent: boolean;

  /**
   * Find events with cursor pagination (for high-volume endpoints)
   */
  static async findWithCursor(
    environmentId: string,
    options: {
      limit?: number;
      cursor?: string;
      verb?: string;
      actorType?: 'User' | 'System';
      webhookOnly?: boolean;
    } = {},
  ): Promise<{ data: Event[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = Math.min(options.limit || 100, 1000);
    const where: any = { environmentId };

    // Apply cursor (timestamp + id for tie-breaking)
    if (options.cursor) {
      const decodedCursor = Buffer.from(options.cursor, 'base64').toString('utf-8');
      const [timestamp, id] = decodedCursor.split('|');
      where[Op.or] = [
        { timestamp: { [Op.lt]: new Date(timestamp) } },
        { timestamp: new Date(timestamp), id: { [Op.lt]: id } },
      ];
    }

    // Apply filters
    if (options.verb) where.verb = options.verb;
    if (options.actorType) where.actorType = options.actorType;
    if (options.webhookOnly) where.isWebhookEvent = true;

    // Fetch limit + 1 to determine if there are more results
    const events = await this.findAll({
      where,
      order: [
        ['timestamp', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: limit + 1,
    });

    const hasMore = events.length > limit;
    const data = hasMore ? events.slice(0, limit) : events;

    // Generate next cursor from last item
    let nextCursor: string | null = null;
    if (hasMore && data.length > 0) {
      const lastEvent = data[data.length - 1];
      const cursorValue = `${lastEvent.timestamp.toISOString()}|${lastEvent.id}`;
      nextCursor = Buffer.from(cursorValue, 'utf-8').toString('base64');
    }

    return { data, nextCursor, hasMore };
  }

  /**
   * Find events by verb
   */
  static async findByVerb(verb: string, environmentId: string, limit = 100): Promise<Event[]> {
    return this.findAll({
      where: { verb, environmentId },
      order: [['timestamp', 'DESC']],
      limit: Math.min(limit, 1000),
    });
  }

  /**
   * Find webhook events only
   */
  static async findWebhookEvents(environmentId: string, limit = 100): Promise<Event[]> {
    return this.findAll({
      where: {
        environmentId,
        isWebhookEvent: true,
      },
      order: [['timestamp', 'DESC']],
      limit: Math.min(limit, 1000),
    });
  }
}

// Initialize Event model
Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    environmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'environment_id',
    },
    verb: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Event verb (e.g., "auth.logout", "device.update")',
    },
    actorType: {
      type: DataTypes.ENUM('User', 'System'),
      allowNull: false,
      field: 'actor_type',
      comment: 'Who performed the action',
    },
    actor: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Actor details including impersonation context if applicable',
    },
    object: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'The primary object being acted upon',
    },
    target: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional target object (e.g., group when adding member)',
    },
    audit: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'HTTP request/response, headers, IP (X-Forwarded-For), user agent',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable event description',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the event occurred (UTC)',
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organization_id',
      comment: 'Denormalized for read performance',
    },
    organizationName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'organization_name',
      comment: 'Denormalized for read performance',
    },
    environmentName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'environment_name',
      comment: 'Denormalized for read performance',
    },
    isWebhookEvent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_webhook_event',
      comment: 'Whether this event should trigger webhooks',
    },
  },
  {
    sequelize,
    tableName: 'event',
    timestamps: false,
    underscored: true,
    indexes: [
      // Cursor pagination index (critical for performance)
      { fields: ['environment_id', 'timestamp', 'id'], name: 'idx_event_cursor_pagination' },
      // Filter indexes
      { fields: ['verb', 'environment_id'] },
      { fields: ['actor_type', 'environment_id'] },
      { fields: ['organization_id'] },
      // Webhook event index
      { fields: ['is_webhook_event', 'timestamp'], where: { is_webhook_event: true } },
      // GIN indexes for JSONB queries
      {
        fields: ['actor'],
        using: 'GIN',
        name: 'idx_event_actor_gin',
      },
      {
        fields: ['audit'],
        using: 'GIN',
        name: 'idx_event_audit_gin',
      },
    ],
  },
);

export default Event;
