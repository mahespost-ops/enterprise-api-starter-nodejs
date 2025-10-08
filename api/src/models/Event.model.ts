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
export type EventCreationAttributes =
  Optional<
    EventAttributes,
    'id' | 'target' | 'audit' | 'description' | 'timestamp' | 'organizationName' | 'environmentName' | 'isWebhookEvent'
  >;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /**
   * Find events with filters, cursor pagination, sorting, and search
   * Used by admin endpoints for system-wide event querying
   * Uses cursor pagination for high-volume scenarios (10M+ records)
   */
  static async findWithFilters(
    filters: {
      verb?: string;
      verbIn?: string[];
      actorType?: 'User' | 'System';
      actorId?: string;
      organizationId?: string;
      organizationIdIn?: string[];
      environmentId?: string;
      environmentIdIn?: string[];
      isWebhookEvent?: boolean;
      timestamp?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
    },
    options: {
      limit?: number;
      cursor?: string;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    } = {},
  ): Promise<{ data: Event[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Record<string, unknown> = {};
    const limit = Math.min(options.limit || 100, 1000);

    // Apply filters
    if (filters.verb) {
      where.verb = filters.verb;
    }

    if (filters.verbIn && filters.verbIn.length > 0) {
      where.verb = { [Op.in]: filters.verbIn };
    }

    if (filters.actorType) {
      where.actorType = filters.actorType;
    }

    // Note: actorId is in JSONB field - requires path extraction
    // For now, we'll skip this filter (would need raw SQL or JSONB operators)

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.organizationIdIn && filters.organizationIdIn.length > 0) {
      where.organizationId = { [Op.in]: filters.organizationIdIn };
    }

    if (filters.environmentId) {
      where.environmentId = filters.environmentId;
    }

    if (filters.environmentIdIn && filters.environmentIdIn.length > 0) {
      where.environmentId = { [Op.in]: filters.environmentIdIn };
    }

    if (filters.isWebhookEvent !== undefined) {
      where.isWebhookEvent = filters.isWebhookEvent;
    }

    // Date range filters
    if (filters.timestamp) {
      const dateFilter: Record<string, unknown> = {};
      if (filters.timestamp.gte) dateFilter[Op.gte as unknown as string] = filters.timestamp.gte;
      if (filters.timestamp.lte) dateFilter[Op.lte as unknown as string] = filters.timestamp.lte;
      if (filters.timestamp.gt) dateFilter[Op.gt as unknown as string] = filters.timestamp.gt;
      if (filters.timestamp.lt) dateFilter[Op.lt as unknown as string] = filters.timestamp.lt;
      if (filters.timestamp.eq) dateFilter[Op.eq as unknown as string] = filters.timestamp.eq;
      if (filters.timestamp.ne) dateFilter[Op.ne as unknown as string] = filters.timestamp.ne;

      // Check for Symbol keys (Op.gte, Op.lte, etc.) using getOwnPropertySymbols
      const symbolKeys = Object.getOwnPropertySymbols(dateFilter);
      if (Object.keys(dateFilter).length > 0 || symbolKeys.length > 0) {
        where.timestamp = dateFilter;
      }
    }

    // Apply cursor (timestamp + id for tie-breaking)
    if (options.cursor) {
      const decodedCursor = Buffer.from(options.cursor, 'base64').toString('utf-8');
      const [timestamp, id] = decodedCursor.split('|');
      where[Op.or as unknown as string] = [
        { timestamp: { [Op.lt]: new Date(timestamp) } },
        { timestamp: new Date(timestamp), id: { [Op.lt]: id } },
      ];
    }

    // Search across specified fields
    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const searchConditions = options.searchFields.map((field) => ({
        [field]: { [Op.iLike as unknown as string]: `%${options.search}%` },
      }));

      // Merge with existing OR condition (cursor)
      const existingOr = where[Op.or as unknown as string] as unknown[];
      if (existingOr) {
        where[Op.and as unknown as string] = [
          { [Op.or as unknown as string]: existingOr },
          { [Op.or as unknown as string]: searchConditions },
        ];
        delete where[Op.or as unknown as string];
      } else {
        where[Op.or as unknown as string] = searchConditions;
      }
    }

    // Sorting (default: timestamp DESC)
    const order: [string, string][] = [];
    if (options.sort && options.sortableFields) {
      const sortField = options.sort.startsWith('-') ? options.sort.slice(1) : options.sort;
      const sortDirection = options.sort.startsWith('-') ? 'DESC' : 'ASC';

      if (options.sortableFields.includes(sortField)) {
        order.push([sortField, sortDirection]);
        // Add id as secondary sort for deterministic ordering
        order.push(['id', 'DESC']);
      }
    } else {
      // Default sort by timestamp DESC + id DESC for cursor pagination
      order.push(['timestamp', 'DESC']);
      order.push(['id', 'DESC']);
    }

    // Field selection
    const attributes = options.fields && options.fields.length > 0 ? options.fields : undefined;

    // Fetch limit + 1 to determine if there are more results
    const events = await this.findAll({
      where,
      order,
      limit: limit + 1,
      attributes,
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
