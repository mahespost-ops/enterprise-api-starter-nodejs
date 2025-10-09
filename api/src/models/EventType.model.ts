/**
 * EventType Model
 * Maps HTTP endpoints (method + path) to event verbs for activity logging
 */

import { Model, DataTypes, Optional, UUIDV1, Op, Order } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import sequelize from '../config/database';

// EventType attributes
export interface EventTypeAttributes {
  id: string;
  verb: string;
  httpMethod: string;
  httpPath: string;
  isWebhookEvent: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export type EventTypeCreationAttributes = Optional<
  EventTypeAttributes,
  'id' | 'isWebhookEvent' | 'description' | 'createdAt' | 'updatedAt'
>;

/**
 * EventType Model Class
 */
export class EventType extends Model<EventTypeAttributes, EventTypeCreationAttributes> implements EventTypeAttributes {
  declare id: string;
  declare verb: string;
  declare httpMethod: string;
  declare httpPath: string;
  declare isWebhookEvent: boolean;
  declare description: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Find event type by HTTP method and path
   */
  static async findByEndpoint(method: string, path: string): Promise<EventType | null> {
    return this.findOne({
      where: {
        httpMethod: method.toUpperCase(),
        httpPath: path,
      },
    });
  }

  /**
   * Get all webhook-enabled event types
   */
  static async getWebhookEvents(): Promise<EventType[]> {
    return this.findAll({
      where: { isWebhookEvent: true },
      order: [['verb', 'ASC']],
    });
  }

  /**
   * Find event types with filters, pagination, sorting, and search
   * Used by admin event-type endpoints for advanced queries
   */
  static async findWithFilters(
    filters: {
      verb?: string | string[];
      httpMethod?: string | string[];
      isWebhookEvent?: boolean;
      createdAt?: {
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
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    },
  ): Promise<{ rows: EventType[]; count: number }> {
    const where: WhereOptions = {};

    // Apply filters - verb (eq, in)
    if (filters.verb !== undefined) {
      if (Array.isArray(filters.verb)) {
        where.verb = { [Op.in]: filters.verb };
      } else {
        where.verb = filters.verb;
      }
    }

    // Apply filters - httpMethod (eq, in)
    if (filters.httpMethod !== undefined) {
      if (Array.isArray(filters.httpMethod)) {
        where.httpMethod = { [Op.in]: filters.httpMethod };
      } else {
        where.httpMethod = filters.httpMethod;
      }
    }

    // Apply filters - isWebhookEvent
    if (filters.isWebhookEvent !== undefined) {
      where.isWebhookEvent = filters.isWebhookEvent;
    }

    // Date filters for createdAt
    if (filters.createdAt) {
      const createdAtConditions: Record<symbol, Date> = {};
      if (filters.createdAt.gte) createdAtConditions[Op.gte] = filters.createdAt.gte;
      if (filters.createdAt.lte) createdAtConditions[Op.lte] = filters.createdAt.lte;
      if (filters.createdAt.gt) createdAtConditions[Op.gt] = filters.createdAt.gt;
      if (filters.createdAt.lt) createdAtConditions[Op.lt] = filters.createdAt.lt;
      if (filters.createdAt.eq) createdAtConditions[Op.eq] = filters.createdAt.eq;
      if (filters.createdAt.ne) createdAtConditions[Op.ne] = filters.createdAt.ne;
      if (Object.getOwnPropertySymbols(createdAtConditions).length > 0) {
        where.createdAt = createdAtConditions;
      }
    }

    // Search across specified fields
    if (options.search && options.searchFields) {
      const searchConditions = options.searchFields.map((field) => ({
        [field]: { [Op.iLike]: `%${options.search}%` },
      }));
      // Type assertion needed for Sequelize Op.or symbol indexing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (where as any)[Op.or] = searchConditions;
    }

    // Parse sort parameter
    let order: Order = [['verb', 'ASC']]; // Default sort
    if (options.sort && options.sortableFields) {
      const sortFields = options.sort.split(',');
      order = sortFields
        .map((field) => {
          const direction = field.startsWith('-') ? 'DESC' : 'ASC';
          const fieldName = field.startsWith('-') ? field.slice(1) : field;

          if (options.sortableFields?.includes(fieldName)) {
            return [fieldName, direction] as [string, string];
          }
          return null;
        })
        .filter((item): item is [string, string] => item !== null);
    }

    // Build query with pagination, sorting, and field selection
    const findOptions: {
      where: WhereOptions;
      limit?: number;
      offset?: number;
      order: Order;
      attributes?: string[];
    } = {
      where,
      order,
    };

    if (options.limit !== undefined) {
      findOptions.limit = options.limit;
    }

    if (options.offset !== undefined) {
      findOptions.offset = options.offset;
    }

    if (options.fields && options.fields.length > 0) {
      findOptions.attributes = options.fields;
    }

    // Execute query
    return this.findAndCountAll(findOptions);
  }
}

// Initialize EventType model
EventType.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    verb: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Event verb (e.g., "auth.logout", "device.update", "auth.register")',
    },
    httpMethod: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'http_method',
      comment: 'HTTP method: GET, POST, PUT, PATCH, DELETE',
    },
    httpPath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'http_path',
      comment: 'API endpoint path template (e.g., "/api/v1/auth/logout")',
    },
    isWebhookEvent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_webhook_event',
      comment: 'Whether this event type can trigger webhooks',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Human-readable description of what this event represents',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'event_type',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['verb'] },
      { fields: ['http_method', 'http_path'] },
      { fields: ['is_webhook_event'], where: { is_webhook_event: true } },
    ],
  },
);

export default EventType;
