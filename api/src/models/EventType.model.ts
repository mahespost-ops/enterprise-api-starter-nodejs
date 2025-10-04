/**
 * EventType Model
 * Maps HTTP endpoints (method + path) to event verbs for activity logging
 */

import { Model, DataTypes, Optional, UUIDV1 } from 'sequelize';
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
export interface EventTypeCreationAttributes
  extends Optional<EventTypeAttributes, 'id' | 'isWebhookEvent' | 'description' | 'createdAt' | 'updatedAt'> {}

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
