/**
 * Webhook Model
 * CloudEvents 1.0.2 compliant webhook configuration
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';

// Webhook attributes
export interface WebhookAttributes {
  id: string;
  environmentId: string;
  name: string;
  url: string;
  eventTypes: string[];
  authMethod: 'none' | 'hmac' | 'jwt' | 'basic' | 'digest';
  authConfig: Record<string, unknown> | null;
  retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
  isActive: boolean;
  failureCount: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Optional fields for creation
export type WebhookCreationAttributes =
  Optional<
    WebhookAttributes,
    | 'id'
    | 'authMethod'
    | 'authConfig'
    | 'retryConfig'
    | 'isActive'
    | 'failureCount'
    | 'lastSuccessAt'
    | 'lastFailureAt'
    | 'metadata'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
  >;

/**
 * Webhook Model Class
 */
export class Webhook extends Model<WebhookAttributes, WebhookCreationAttributes> implements WebhookAttributes {
  declare id: string;
  declare environmentId: string;
  declare name: string;
  declare url: string;
  declare eventTypes: string[];
  declare authMethod: 'none' | 'hmac' | 'jwt' | 'basic' | 'digest';
  declare authConfig: Record<string, unknown> | null;
  declare retryConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
  declare isActive: boolean;
  declare failureCount: number;
  declare lastSuccessAt: Date | null;
  declare lastFailureAt: Date | null;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;

  /**
   * Find active webhooks for environment
   */
  static async findActiveByEnvironment(environmentId: string): Promise<Webhook[]> {
    return this.findAll({
      where: {
        environmentId,
        isActive: true,
      },
      paranoid: true,
      order: [['name', 'ASC']],
    });
  }

  /**
   * Find webhooks subscribed to a specific event type
   */
  static async findByEventType(environmentId: string, eventType: string): Promise<Webhook[]> {
    return this.findAll({
      where: {
        environmentId,
        isActive: true,
        eventTypes: {
          [Op.contains]: [eventType],
        },
      },
      paranoid: true,
    });
  }

  /**
   * Record successful delivery
   */
  async recordSuccess(): Promise<void> {
    this.lastSuccessAt = new Date();
    this.failureCount = 0;
    await this.save();
  }

  /**
   * Record failed delivery
   */
  async recordFailure(): Promise<void> {
    this.lastFailureAt = new Date();
    this.failureCount += 1;
    await this.save();
  }

  /**
   * Disable webhook due to excessive failures
   */
  async disable(reason?: string): Promise<void> {
    this.isActive = false;
    if (reason && this.metadata) {
      this.metadata.disabledReason = reason;
    } else if (reason) {
      this.metadata = { disabledReason: reason };
    }
    await this.save();
  }
}

// Initialize Webhook model
Webhook.init(
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Human-readable webhook name',
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
      validate: {
        isUrl: true,
      },
      comment: 'HTTPS endpoint to POST events to',
    },
    eventTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: 'event_types',
      comment: 'Array of event verbs this webhook subscribes to',
    },
    authMethod: {
      type: DataTypes.ENUM('none', 'hmac', 'jwt', 'basic', 'digest'),
      allowNull: false,
      defaultValue: 'none',
      field: 'auth_method',
      comment: 'Authentication method for webhook requests',
    },
    authConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'auth_config',
      comment: 'Encrypted credentials and auth configuration',
    },
    retryConfig: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        maxAttempts: 5,
        backoffMultiplier: 2,
        maxBackoffSeconds: 3600,
      },
      field: 'retry_config',
      comment: 'Retry policy with exponential backoff',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Whether webhook is enabled',
    },
    failureCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'failure_count',
      comment: 'Consecutive failure count (reset on success)',
    },
    lastSuccessAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_success_at',
    },
    lastFailureAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_failure_at',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional webhook metadata',
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'webhook',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['environment_id', 'is_active'], where: { deleted_at: null } },
      {
        fields: ['event_types'],
        using: 'GIN',
        name: 'idx_webhook_event_types_gin',
      },
      { fields: ['is_active'], where: { is_active: true, deleted_at: null } },
      { fields: ['last_success_at'], where: { last_success_at: { [Op.ne]: null } } },
    ],
  },
);

export default Webhook;
