/**
 * Mock Email Adapter
 *
 * In-memory email adapter for testing and local development.
 * Stores sent emails in memory and logs them.
 */

import type {
  IEmailAdapter,
  ISendEmailParams,
  IEmailResult,
  IBulkEmailParams,
  IBulkEmailResult,
} from './email.interface';
import logger from '../../config/logger';

export class MockEmailAdapter implements IEmailAdapter {
  private sentEmails: Array<{
    params: ISendEmailParams;
    result: IEmailResult;
  }> = [];

  async sendEmail(params: ISendEmailParams): Promise<IEmailResult> {
    const messageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const recipients = Array.isArray(params.to) ? params.to : [params.to];

    const result: IEmailResult = {
      messageId,
      accepted: recipients,
      rejected: [],
      timestamp: new Date(),
    };

    this.sentEmails.push({ params, result });

    logger.info('Mock email sent', {
      messageId,
      to: params.to,
      subject: params.subject,
      from: params.from,
    });

    return result;
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

      await Promise.all(
        batch.map(async (emailParams) => {
          try {
            const result = await this.sendEmail(emailParams);
            results.push(result);
            successful++;
          } catch (error) {
            const recipients = Array.isArray(emailParams.to) ? emailParams.to : [emailParams.to];
            errors.push({
              email: recipients.join(', '),
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
          }
        })
      );
    }

    logger.info('Bulk email completed', {
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
    logger.info('Validating mock email adapter configuration');
    return true;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up mock email adapter', {
      sentEmailsCount: this.sentEmails.length,
    });
    this.sentEmails = [];
  }

  /**
   * Test helper: Get all sent emails
   */
  public getSentEmails(): Array<{ params: ISendEmailParams; result: IEmailResult }> {
    return this.sentEmails;
  }

  /**
   * Test helper: Clear sent emails
   */
  public clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Test helper: Get the latest magic token sent to an email address
   * Extracts token and code from the email HTML
   */
  public getLatestMagicTokenForEmail(email: string): { token: string; code: string } | null {
    // Find the most recent email sent to this address
    const emailsToUser = this.sentEmails.filter((sent) => {
      const recipients = Array.isArray(sent.params.to) ? sent.params.to : [sent.params.to];
      return recipients.includes(email);
    });

    if (emailsToUser.length === 0) {
      return null;
    }

    // Get the latest email
    const latestEmail = emailsToUser[emailsToUser.length - 1];
    const html = latestEmail.params.html || '';

    // Extract token from URL parameter: ?token=xxxxx
    const tokenMatch = html.match(/token=([^"&\s]+)/);
    const token = tokenMatch ? tokenMatch[1] : '';

    // Extract code from HTML: <strong>123456</strong>
    const codeMatch = html.match(/<strong>(\d{6})<\/strong>/);
    const code = codeMatch ? codeMatch[1] : '';

    if (!token || !code) {
      return null;
    }

    return { token, code };
  }
}
