/**
 * Email Adapter Interface
 *
 * Provides a provider-agnostic interface for sending emails.
 * Supports both single and bulk email operations.
 */

export interface ISendEmailParams {
  to: string | string[];
  from?: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: IEmailAttachment[];
  metadata?: Record<string, string>;
}

export interface IEmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface IEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  timestamp: Date;
}

export interface IBulkEmailParams {
  emails: ISendEmailParams[];
  batchSize?: number;
}

export interface IBulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  results: IEmailResult[];
  errors?: Array<{
    email: string;
    error: string;
  }>;
}

export interface IEmailAdapter {
  /**
   * Send a single email
   */
  sendEmail(params: ISendEmailParams): Promise<IEmailResult>;

  /**
   * Send multiple emails in batches
   */
  sendBulkEmail(params: IBulkEmailParams): Promise<IBulkEmailResult>;

  /**
   * Validate email configuration
   */
  validateConfig(): Promise<boolean>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}
