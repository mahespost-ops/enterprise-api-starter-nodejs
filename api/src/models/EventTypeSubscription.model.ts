/**
 * Event Type Subscription Model
 * Reverse-lookup table for fast event → webhook queries
 *
 * This is a denormalized helper table automatically populated by webhook lifecycle:
 * - When webhook is created/updated with event_types array, creates N subscription records
 * - Each record denormalizes webhook fields for performance (avoid joins)
 * - Enables fast "find all webhooks for event X" queries without expensive joins
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';
import { type WebhookAuthMethod } from '../constants/webhook.constants';

// Event Type Subscription attributes
export interface EventTypeSubscriptionAttributes {
  id: string;
  eventTypeId: string;
  eventTypeVerb: string; // Denormalized from event_type.verb
  webhookId: string;
  webhookName: string; // Denormalized from webhook.name
  webhookUrl: string; // Denormalized from webhook.url
  webhookAuthMethod: WebhookAuthMethod; // Denormalized from webhook.auth_method
  webhookAuthConfig: Record<string, unknown> | null; // Denormalized from webhook.auth_config
  webhookRetryConfig: Record<string, unknown>; // Denormalized from webhook.retry_config
  webhookMetadata: Record<string, unknown> | null; // Denormalized from webhook.metadata
  isActive: boolean; // Denormalized from webhook.is_active
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export type EventTypeSubscriptionCreationAttributes = Optional<
  EventTypeSubscriptionAttributes,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * EventTypeSubscription Model Class
 */
export class EventTypeSubscription
  extends Model<EventTypeSubscriptionAttributes, EventTypeSubscriptionCreationAttributes>
  implements EventTypeSubscriptionAttributes
{
  declare id: string;
  declare eventTypeId: string;
  declare eventTypeVerb: string;
  declare webhookId: string;
  declare webhookName: string;
  declare webhookUrl: string;
  declare webhookAuthMethod: WebhookAuthMethod;
  declare webhookAuthConfig: Record<string, unknown> | null;
  declare webhookRetryConfig: Record<string, unknown>;
  declare webhookMetadata: Record<string, unknown> | null;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  /**
   * Find active subscriptions for a specific event type verb
   * Used for webhook delivery: "which webhooks should receive this event?"
   */
  static async findActiveByEventTypeVerb(eventTypeVerb: string): Promise<EventTypeSubscription[]> {
    return this.findAll({
      where: {
        eventTypeVerb,
        isActive: true,
      },
      order: [['createdAt', 'ASC']],
    });
  }

  /**
   * Find all subscriptions for a specific webhook
   * Used for webhook management: "what events is this webhook subscribed to?"
   */
  static async findByWebhookId(webhookId: string): Promise<EventTypeSubscription[]> {
    return this.findAll({
      where: {
        webhookId,
      },
      order: [['eventTypeVerb', 'ASC']],
    });
  }

  /**
   * Find subscriptions with filters, pagination, sorting, and search (admin)
   * All database query logic isolated in model layer per SOC
   */
  static async findWithFilters(
    filters: {
      eventTypeId?: string;
      eventTypeVerb?: string;
      webhookId?: string;
      webhookName?: string;
      webhookUrl?: string;
      isActive?: boolean;
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
  ): Promise<{ rows: EventTypeSubscription[]; count: number }> {
    const {
      limit = 20,
      offset = 0,
      sort = '-createdAt',
      search,
      searchFields = ['eventTypeVerb', 'webhookName', 'webhookUrl'],
      sortableFields = ['eventTypeVerb', 'webhookName', 'webhookUrl', 'createdAt', 'updatedAt', 'isActive'],
      fields,
    } = options;

    // Build where clause from filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Filter by eventTypeId
    if (filters.eventTypeId) {
      where.eventTypeId = filters.eventTypeId;
    }

    // Filter by eventTypeVerb (exact match)
    if (filters.eventTypeVerb) {
      where.eventTypeVerb = filters.eventTypeVerb;
    }

    // Filter by webhookId
    if (filters.webhookId) {
      where.webhookId = filters.webhookId;
    }

    // Filter by webhookName (partial match)
    if (filters.webhookName) {
      where.webhookName = { [Op.iLike]: `%${filters.webhookName}%` };
    }

    // Filter by webhookUrl (partial match)
    if (filters.webhookUrl) {
      where.webhookUrl = { [Op.iLike]: `%${filters.webhookUrl}%` };
    }

    // Filter by isActive
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
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
    });
  }

  /**
   * Create subscriptions for a webhook's event types
   * Used when webhook is created or event_types is updated
   */
  static async createForWebhook(
    webhookId: string,
    eventTypeVerbs: string[],
    webhookData: {
      name: string;
      url: string;
      authMethod: WebhookAuthMethod;
      authConfig: Record<string, unknown> | null;
      retryConfig: Record<string, unknown>;
      metadata: Record<string, unknown> | null;
      isActive: boolean;
    }
  ): Promise<EventTypeSubscription[]> {
    // Fetch event type IDs for the given verbs
    const { EventType } = await import('./EventType.model');
    const eventTypes = await EventType.findAll({
      where: {
        verb: {
          [Op.in]: eventTypeVerbs,
        },
      },
      attributes: ['id', 'verb'],
    });

    // Create subscription records
    const subscriptions = await Promise.all(
      eventTypes.map((eventType) =>
        this.create({
          eventTypeId: eventType.id,
          eventTypeVerb: eventType.verb,
          webhookId,
          webhookName: webhookData.name,
          webhookUrl: webhookData.url,
          webhookAuthMethod: webhookData.authMethod,
          webhookAuthConfig: webhookData.authConfig,
          webhookRetryConfig: webhookData.retryConfig,
          webhookMetadata: webhookData.metadata,
          isActive: webhookData.isActive,
        })
      )
    );

    return subscriptions;
  }

  /**
   * Delete subscriptions for a webhook's event types
   * Used when webhook.event_types is updated (remove old subscriptions)
   */
  static async deleteForWebhookEventTypes(webhookId: string, eventTypeVerbs: string[]): Promise<number> {
    const result = await this.destroy({
      where: {
        webhookId,
        eventTypeVerb: {
          [Op.in]: eventTypeVerbs,
        },
      },
    });

    return result;
  }

  /**
   * Update denormalized webhook fields for all subscriptions of a webhook
   * Used when webhook metadata changes (name, url, auth, etc.)
   */
  static async updateWebhookFields(
    webhookId: string,
    updates: Partial<{
      webhookName: string;
      webhookUrl: string;
      webhookAuthMethod: WebhookAuthMethod;
      webhookAuthConfig: Record<string, unknown> | null;
      webhookRetryConfig: Record<string, unknown>;
      webhookMetadata: Record<string, unknown> | null;
      isActive: boolean;
    }>
  ): Promise<number> {
    const [affectedCount] = await this.update(updates, {
      where: {
        webhookId,
      },
    });

    return affectedCount;
  }
}

// Initialize EventTypeSubscription model
EventTypeSubscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    eventTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'event_type_id',
    },
    eventTypeVerb: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'event_type_verb',
      comment: 'Denormalized event verb for fast lookups',
    },
    webhookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'webhook_id',
    },
    webhookName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'webhook_name',
      comment: 'Denormalized webhook name',
    },
    webhookUrl: {
      type: DataTypes.STRING(2048),
      allowNull: false,
      field: 'webhook_url',
      comment: 'Denormalized webhook URL',
    },
    webhookAuthMethod: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'webhook_auth_method',
      comment: 'Denormalized auth method',
    },
    webhookAuthConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'webhook_auth_config',
      comment: 'Denormalized auth config',
    },
    webhookRetryConfig: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'webhook_retry_config',
      comment: 'Denormalized retry config',
    },
    webhookMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'webhook_metadata',
      comment: 'Denormalized webhook metadata',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Denormalized from webhook.is_active',
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
    tableName: 'event_type_subscription',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['event_type_id'],
        where: { is_active: true },
        name: 'idx_event_type_sub_event_type_id',
      },
      {
        fields: ['event_type_verb'],
        where: { is_active: true },
        name: 'idx_event_type_sub_event_type_verb',
      },
      { fields: ['webhook_id'], name: 'idx_event_type_sub_webhook_id' },
      { fields: ['is_active'], name: 'idx_event_type_sub_is_active' },
      { fields: ['webhook_name'], name: 'idx_event_type_sub_webhook_name' },
      { fields: ['webhook_url'], name: 'idx_event_type_sub_webhook_url' },
    ],
  }
);

export default EventTypeSubscription;
