/**
 * Webhook Model
 * CloudEvents 1.0.2 compliant webhook configuration
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';
import { WEBHOOK_AUTH_METHOD, type WebhookAuthMethod } from '../constants/webhook.constants';

// Webhook attributes
export interface WebhookAttributes {
  id: string;
  environmentId: string;
  name: string;
  url: string;
  eventTypes: string[];
  authMethod: WebhookAuthMethod;
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
  declare authMethod: WebhookAuthMethod;
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
   * Find webhooks by environment with filters
   * All database query logic isolated in model layer per SOC
   */
  static async findByEnvironment(
    environmentId: string,
    filters: {
      isActive?: boolean;
      authMethod?: string;
      search?: string;
    } = {},
    options: {
      limit?: number;
      offset?: number;
      fields?: string[];
    } = {}
  ): Promise<{ rows: Webhook[]; count: number }> {
    const { limit = 20, offset = 0, fields } = options;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { environmentId };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.authMethod) {
      where.authMethod = filters.authMethod;
    }

    if (filters.search) {
      where.name = { [Op.iLike]: `%${filters.search}%` };
    }

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: fields && fields.length > 0 ? ['id', ...fields] : undefined,
      paranoid: true,
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

  /**
   * Find webhooks with filters, pagination, sorting, and search (admin)
   * All database query logic isolated in model layer per SOC
   */
  static async findWithFilters(
    filters: {
      environmentId?: string;
      isActive?: boolean;
      authMethod?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
      updatedAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
      lastSuccessAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
      lastFailureAt?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
        eq?: Date;
        ne?: Date;
      };
    } = {},
    options: {
      limit?: number;
      offset?: number;
      sort?: string;
      search?: string;
      searchFields?: string[];
      sortableFields?: string[];
      fields?: string[];
    } = {}
  ): Promise<{ rows: Webhook[]; count: number }> {
    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      searchFields = ['url', 'name'],
      sortableFields = [
        'createdAt',
        'updatedAt',
        'lastSuccessAt',
        'lastFailureAt',
        'failureCount',
        'url',
        'name',
      ],
      fields,
    } = options;

    // Build where clause from filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by environmentId
    if (filters.environmentId) {
      where.environmentId = filters.environmentId;
    }

    // Filter by isActive
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Filter by authMethod
    if (filters.authMethod) {
      where.authMethod = filters.authMethod;
    }

    // Filter by createdAt
    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte) where.createdAt[Op.gte] = filters.createdAt.gte;
      if (filters.createdAt.lte) where.createdAt[Op.lte] = filters.createdAt.lte;
      if (filters.createdAt.gt) where.createdAt[Op.gt] = filters.createdAt.gt;
      if (filters.createdAt.lt) where.createdAt[Op.lt] = filters.createdAt.lt;
      if (filters.createdAt.eq) where.createdAt[Op.eq] = filters.createdAt.eq;
      if (filters.createdAt.ne) where.createdAt[Op.ne] = filters.createdAt.ne;
    }

    // Filter by updatedAt
    if (filters.updatedAt) {
      where.updatedAt = {};
      if (filters.updatedAt.gte) where.updatedAt[Op.gte] = filters.updatedAt.gte;
      if (filters.updatedAt.lte) where.updatedAt[Op.lte] = filters.updatedAt.lte;
      if (filters.updatedAt.gt) where.updatedAt[Op.gt] = filters.updatedAt.gt;
      if (filters.updatedAt.lt) where.updatedAt[Op.lt] = filters.updatedAt.lt;
      if (filters.updatedAt.eq) where.updatedAt[Op.eq] = filters.updatedAt.eq;
      if (filters.updatedAt.ne) where.updatedAt[Op.ne] = filters.updatedAt.ne;
    }

    // Filter by lastSuccessAt
    if (filters.lastSuccessAt) {
      where.lastSuccessAt = {};
      if (filters.lastSuccessAt.gte) where.lastSuccessAt[Op.gte] = filters.lastSuccessAt.gte;
      if (filters.lastSuccessAt.lte) where.lastSuccessAt[Op.lte] = filters.lastSuccessAt.lte;
      if (filters.lastSuccessAt.gt) where.lastSuccessAt[Op.gt] = filters.lastSuccessAt.gt;
      if (filters.lastSuccessAt.lt) where.lastSuccessAt[Op.lt] = filters.lastSuccessAt.lt;
      if (filters.lastSuccessAt.eq) where.lastSuccessAt[Op.eq] = filters.lastSuccessAt.eq;
      if (filters.lastSuccessAt.ne) where.lastSuccessAt[Op.ne] = filters.lastSuccessAt.ne;
    }

    // Filter by lastFailureAt
    if (filters.lastFailureAt) {
      where.lastFailureAt = {};
      if (filters.lastFailureAt.gte) where.lastFailureAt[Op.gte] = filters.lastFailureAt.gte;
      if (filters.lastFailureAt.lte) where.lastFailureAt[Op.lte] = filters.lastFailureAt.lte;
      if (filters.lastFailureAt.gt) where.lastFailureAt[Op.gt] = filters.lastFailureAt.gt;
      if (filters.lastFailureAt.lt) where.lastFailureAt[Op.lt] = filters.lastFailureAt.lt;
      if (filters.lastFailureAt.eq) where.lastFailureAt[Op.eq] = filters.lastFailureAt.eq;
      if (filters.lastFailureAt.ne) where.lastFailureAt[Op.ne] = filters.lastFailureAt.ne;
    }

    // Search across multiple fields
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = searchFields.map((field) => ({
        [field]: { [Op.iLike]: searchPattern },
      }));
    }

    // Parse sort parameter
    const order: [string, string][] = [];
    if (sort) {
      const sortFields = sort.split(',');
      for (const field of sortFields) {
        if (field.startsWith('-')) {
          const fieldName = field.substring(1);
          if (sortableFields.includes(fieldName)) {
            order.push([fieldName, 'DESC']);
          }
        } else {
          if (sortableFields.includes(field)) {
            order.push([field, 'ASC']);
          }
        }
      }
    }

    return this.findAndCountAll({
      where,
      limit,
      offset,
      order: order.length > 0 ? order : [['createdAt', 'DESC']],
      attributes: fields && fields.length > 0 ? (fields.includes('id') ? fields : ['id', ...fields]) : undefined,
      paranoid: true,
    });
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
      type: DataTypes.ENUM(
        WEBHOOK_AUTH_METHOD.NONE,
        WEBHOOK_AUTH_METHOD.HMAC,
        WEBHOOK_AUTH_METHOD.JWT,
        WEBHOOK_AUTH_METHOD.BASIC,
        WEBHOOK_AUTH_METHOD.DIGEST
      ),
      allowNull: false,
      defaultValue: WEBHOOK_AUTH_METHOD.NONE,
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
