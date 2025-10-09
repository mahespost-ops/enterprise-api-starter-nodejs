/**
 * SMTP Email Adapter
 *
 * Production-ready email adapter using SMTP via Nodemailer.
 * Supports any SMTP server (Gmail, Office365, custom, etc.).
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type {
  IEmailAdapter,
  ISendEmailParams,
  IEmailResult,
  IBulkEmailParams,
  IBulkEmailResult,
  IEmailAttachment,
} from './email.interface';
import logger from '../../config/logger';

export interface ISMTPConfig {
  host: string;
  port: number;
  secure?: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
  defaultFrom?: string;
  pool?: boolean; // Use pooled connections
  maxConnections?: number; // Max concurrent connections
  maxMessages?: number; // Max messages per connection
}

export class SMTPEmailAdapter implements IEmailAdapter {
  private readonly config: ISMTPConfig;
  private transporter: Transporter | null = null;

  constructor(config: ISMTPConfig) {
    this.config = config;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const transportOptions = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure ?? this.config.port === 465,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
        pool: this.config.pool ?? true,
        maxConnections: this.config.maxConnections ?? 5,
        maxMessages: this.config.maxMessages ?? 100,
      };
      this.transporter = nodemailer.createTransport(transportOptions);
    }
    return this.transporter;
  }

  async sendEmail(params: ISendEmailParams): Promise<IEmailResult> {
    const from = params.from || this.config.defaultFrom;
    if (!from) {
      throw new Error('From address is required');
    }

    const transporter = this.getTransporter();

    const mailOptions = {
      from,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: params.html,
      cc: params.cc,
      bcc: params.bcc,
      replyTo: params.replyTo,
      attachments: params.attachments?.map(this.formatAttachment),
      headers: params.metadata
        ? Object.entries(params.metadata).reduce(
            (acc, [key, value]) => {
              acc[`X-${key}`] = value;
              return acc;
            },
            {} as Record<string, string>
          )
        : undefined,
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      const result: IEmailResult = {
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
        timestamp: new Date(),
      };

      logger.info('SMTP email sent successfully', {
        messageId: result.messageId,
        to: params.to,
        subject: params.subject,
        accepted: result.accepted.length,
        rejected: result.rejected.length,
      });

      return result;
    } catch (error) {
      logger.error('SMTP email send failed', {
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

    // Process in batches
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
    }

    logger.info('SMTP bulk email completed', {
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
      const transporter = this.getTransporter();
      await transporter.verify();

      logger.info('SMTP configuration validated', {
        host: this.config.host,
        port: this.config.port,
        user: this.config.auth.user,
      });

      return true;
    } catch (error) {
      logger.error('SMTP configuration validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: this.config.host,
        port: this.config.port,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info('SMTP email adapter cleanup completed');
    }
  }

  /**
   * Format attachment for Nodemailer
   */
  private formatAttachment(attachment: IEmailAttachment): {
    filename: string;
    content: Buffer | string;
    contentType: string | undefined;
    encoding: string | undefined;
  } {
    return {
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
      encoding: attachment.encoding,
    };
  }
}
