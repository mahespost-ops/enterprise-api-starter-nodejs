/**
 * WebhookDelivery Model
 * Tracks webhook delivery attempts with retry scheduling
 */

import { Model, DataTypes, Optional, UUIDV1, Op } from 'sequelize';
import sequelize from '../config/database';
import { WEBHOOK_DELIVERY_STATUS, type WebhookDeliveryStatus } from '../constants/webhook.constants';

// WebhookDelivery attributes
export interface WebhookDeliveryAttributes {
  id: string;
  webhookId: string;
  eventId: string;
  status: WebhookDeliveryStatus;
  attempt: number;
  httpStatusCode: number | null;
  requestPayload: Record<string, unknown>;
  responseBody: string | null;
  errorMessage: string | null;
  scheduledFor: Date;
  sentAt: Date | null;
  completedAt: Date | null;
  nextRetryAt: Date | null;
  createdAt: Date;
}

// Optional fields for creation
export type WebhookDeliveryCreationAttributes =
  Optional<
    WebhookDeliveryAttributes,
    | 'id'
    | 'status'
    | 'attempt'
    | 'httpStatusCode'
    | 'responseBody'
    | 'errorMessage'
    | 'scheduledFor'
    | 'sentAt'
    | 'completedAt'
    | 'nextRetryAt'
    | 'createdAt'
  >;

/**
 * WebhookDelivery Model Class
 */
export class WebhookDelivery
  extends Model<WebhookDeliveryAttributes, WebhookDeliveryCreationAttributes>
  implements WebhookDeliveryAttributes
{
  declare id: string;
  declare webhookId: string;
  declare eventId: string;
  declare status: WebhookDeliveryStatus;
  declare attempt: number;
  declare httpStatusCode: number | null;
  declare requestPayload: Record<string, unknown>;
  declare responseBody: string | null;
  declare errorMessage: string | null;
  declare scheduledFor: Date;
  declare sentAt: Date | null;
  declare completedAt: Date | null;
  declare nextRetryAt: Date | null;
  declare readonly createdAt: Date;

  /**
   * Find pending deliveries ready to send
   */
  static async findPendingDeliveries(limit = 100): Promise<WebhookDelivery[]> {
    return this.findAll({
      where: {
        status: { [Op.in]: [WEBHOOK_DELIVERY_STATUS.PENDING, WEBHOOK_DELIVERY_STATUS.RETRYING] },
        scheduledFor: { [Op.lte]: new Date() },
      },
      order: [['scheduledFor', 'ASC']],
      limit: Math.min(limit, 1000),
    });
  }

  /**
   * Find deliveries for a webhook
   */
  static async findByWebhook(webhookId: string, limit = 100): Promise<WebhookDelivery[]> {
    return this.findAll({
      where: { webhookId },
      order: [['createdAt', 'DESC']],
      limit: Math.min(limit, 1000),
    });
  }

  /**
   * Find deliveries for an event
   */
  static async findByEvent(eventId: string): Promise<WebhookDelivery[]> {
    return this.findAll({
      where: { eventId },
      order: [['createdAt', 'ASC']],
    });
  }

  /**
   * Mark delivery as successful
   */
  async markSuccess(httpStatusCode: number, responseBody?: string): Promise<void> {
    this.status = WEBHOOK_DELIVERY_STATUS.SUCCESS;
    this.httpStatusCode = httpStatusCode;
    this.responseBody = responseBody || null;
    this.completedAt = new Date();
    this.sentAt = new Date();
    await this.save();
  }

  /**
   * Mark delivery as failed and schedule retry
   */
  async markFailed(errorMessage: string, nextRetryAt?: Date, httpStatusCode?: number): Promise<void> {
    this.status = nextRetryAt ? WEBHOOK_DELIVERY_STATUS.RETRYING : WEBHOOK_DELIVERY_STATUS.FAILED;
    this.errorMessage = errorMessage;
    this.httpStatusCode = httpStatusCode || null;
    this.nextRetryAt = nextRetryAt || null;
    this.sentAt = new Date();

    if (!nextRetryAt) {
      this.completedAt = new Date();
    }

    await this.save();
  }

  /**
   * Increment attempt counter and update status
   */
  async incrementAttempt(): Promise<void> {
    this.attempt += 1;
    this.status = WEBHOOK_DELIVERY_STATUS.RETRYING;
    await this.save();
  }
}

// Initialize WebhookDelivery model
WebhookDelivery.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV1,
      primaryKey: true,
    },
    webhookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'webhook_id',
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'event_id',
    },
    status: {
      type: DataTypes.ENUM(
        WEBHOOK_DELIVERY_STATUS.PENDING,
        WEBHOOK_DELIVERY_STATUS.SUCCESS,
        WEBHOOK_DELIVERY_STATUS.FAILED,
        WEBHOOK_DELIVERY_STATUS.RETRYING
      ),
      allowNull: false,
      defaultValue: WEBHOOK_DELIVERY_STATUS.PENDING,
    },
    attempt: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Current attempt number (starts at 1)',
    },
    httpStatusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'http_status_code',
    },
    requestPayload: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'request_payload',
      comment: 'CloudEvents 1.0.2 formatted payload',
    },
    responseBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'response_body',
      comment: 'First 10KB of response body',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'scheduled_for',
      comment: 'When this delivery should be attempted',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at',
      comment: 'When the HTTP request was sent',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
      comment: 'When the delivery reached terminal state (success/failed)',
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_retry_at',
      comment: 'When to retry after failure (exponential backoff)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'webhook_delivery',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['webhook_id', 'created_at'] },
      { fields: ['event_id'] },
      {
        fields: ['status', 'scheduled_for'],
        where: { status: { [Op.in]: [WEBHOOK_DELIVERY_STATUS.PENDING, WEBHOOK_DELIVERY_STATUS.RETRYING] } },
      },
      { fields: ['next_retry_at'], where: { next_retry_at: { [Op.ne]: null } } },
      { fields: ['created_at'] },
    ],
  },
);

export default WebhookDelivery;
