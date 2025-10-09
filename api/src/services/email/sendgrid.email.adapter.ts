/**
 * SendGrid Email Adapter
 *
 * Production-ready email adapter using SendGrid API.
 * Requires SENDGRID_API_KEY environment variable.
 */

import sgMail from '@sendgrid/mail';
import type {
  IEmailAdapter,
  ISendEmailParams,
  IEmailResult,
  IBulkEmailParams,
  IBulkEmailResult,
  IEmailAttachment,
} from './email.interface';
import logger from '../../config/logger';

export interface ISendGridConfig {
  apiKey: string;
  defaultFrom?: string;
}

export class SendGridEmailAdapter implements IEmailAdapter {
  private readonly config: ISendGridConfig;
  private initialized = false;

  constructor(config: ISendGridConfig) {
    this.config = config;
  }

  private initialize(): void {
    if (!this.initialized) {
      sgMail.setApiKey(this.config.apiKey);
      this.initialized = true;
    }
  }

  async sendEmail(params: ISendEmailParams): Promise<IEmailResult> {
    this.initialize();

    const from = params.from || this.config.defaultFrom;
    if (!from) {
      throw new Error('From address is required');
    }

    const msg = {
      to: params.to,
      from,
      subject: params.subject,
      text: params.body,
      html: params.html,
      cc: params.cc,
      bcc: params.bcc,
      replyTo: params.replyTo,
      attachments: params.attachments?.map(this.formatAttachment),
      customArgs: params.metadata,
    };

    try {
      const [response] = await sgMail.send(msg);

      const recipients = Array.isArray(params.to) ? params.to : [params.to];

      const result: IEmailResult = {
        messageId: response.headers['x-message-id'] || `sg-${Date.now()}`,
        accepted: recipients,
        rejected: [],
        timestamp: new Date(),
      };

      logger.info('SendGrid email sent successfully', {
        messageId: result.messageId,
        to: params.to,
        subject: params.subject,
        statusCode: response.statusCode,
      });

      return result;
    } catch (error) {
      logger.error('SendGrid email send failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: params.to,
        subject: params.subject,
      });
      throw error;
    }
  }

  async sendBulkEmail(params: IBulkEmailParams): Promise<IBulkEmailResult> {
    const batchSize = params.batchSize || 10;
    const results: IEmailResult[] = [];
    const errors: Array<{ email: string; error: string }> = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < params.emails.length; i += batchSize) {
      const batch = params.emails.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (emailParams) => {
          try {
            const result = await this.sendEmail(emailParams);
            results.push(result);
            successful++;
          } catch (error) {
            const recipients = Array.isArray(emailParams.to)
              ? emailParams.to
              : [emailParams.to];
            errors.push({
              email: recipients.join(', '),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < params.emails.length) {
        await this.delay(100);
      }
    }

    logger.info('SendGrid bulk email completed', {
      total: params.emails.length,
      successful,
      failed,
    });

    return {
      total: params.emails.length,
      successful,
      failed,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async validateConfig(): Promise<boolean> {
    try {
      this.initialize();

      if (!this.config.apiKey || !this.config.apiKey.startsWith('SG.')) {
        logger.warn('Invalid SendGrid API key format');
        return false;
      }

      logger.info('SendGrid configuration validated');
      return true;
    } catch (error) {
      logger.error('SendGrid configuration validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('SendGrid email adapter cleanup completed');
  }

  /**
   * Format attachment for SendGrid API
   */
  private formatAttachment(attachment: IEmailAttachment): {
    filename: string;
    content: string;
    type: string | undefined;
    disposition: 'attachment';
  } {
    let content: string;
    if (attachment.content instanceof Buffer) {
      content = attachment.content.toString('base64');
    } else if (typeof attachment.content === 'string') {
      content = attachment.content;
    } else {
      content = '';
    }

    return {
      filename: attachment.filename,
      content,
      type: attachment.contentType,
      disposition: 'attachment' as const,
    };
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
