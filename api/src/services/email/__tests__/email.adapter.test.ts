/**
 * Email Adapter Tests
 *
 * Comprehensive test suite for all email adapter implementations.
 * Tests the adapter interface contract that all providers must satisfy.
 */

import type {
  IEmailAdapter,
  ISendEmailParams,
  IBulkEmailParams,
} from '../email.interface';
import { MockEmailAdapter } from '../mock.email.adapter';

describe('Email Adapter Interface Contract', () => {
  let adapter: IEmailAdapter;

  beforeEach(() => {
    adapter = new MockEmailAdapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('sendEmail', () => {
    it('should send a basic email successfully', async () => {
      const params: ISendEmailParams = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const result = await adapter.sendEmail(params);

      expect(result).toMatchObject({
        messageId: expect.any(String),
        accepted: ['test@example.com'],
        rejected: [],
        timestamp: expect.any(Date),
      });
      expect(result.messageId).toBeTruthy();
    });

    it('should send email with HTML content', async () => {
      const params: ISendEmailParams = {
        to: 'test@example.com',
        subject: 'HTML Email',
        body: 'Plain text version',
        html: '<h1>HTML Version</h1>',
      };

      const result = await adapter.sendEmail(params);

      expect(result.accepted).toContain('test@example.com');
      expect(result.messageId).toBeTruthy();
    });

    it('should send email to multiple recipients', async () => {
      const params: ISendEmailParams = {
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Multi-recipient Email',
        body: 'Email for multiple people',
      };

      const result = await adapter.sendEmail(params);

      expect(result.accepted).toEqual([
        'user1@example.com',
        'user2@example.com',
        'user3@example.com',
      ]);
    });

    it('should send email with CC and BCC', async () => {
      const params: ISendEmailParams = {
        to: 'primary@example.com',
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: 'bcc@example.com',
        subject: 'Email with CC and BCC',
        body: 'Test email',
      };

      const result = await adapter.sendEmail(params);

      expect(result.messageId).toBeTruthy();
      expect(result.accepted.length).toBeGreaterThan(0);
    });

    it('should send email with custom from address', async () => {
      const params: ISendEmailParams = {
        to: 'recipient@example.com',
        from: 'custom-sender@example.com',
        subject: 'Custom From Email',
        body: 'Email with custom sender',
      };

      const result = await adapter.sendEmail(params);

      expect(result.accepted).toContain('recipient@example.com');
    });

    it('should send email with reply-to address', async () => {
      const params: ISendEmailParams = {
        to: 'recipient@example.com',
        subject: 'Email with Reply-To',
        body: 'Please reply to different address',
        replyTo: 'replies@example.com',
      };

      const result = await adapter.sendEmail(params);

      expect(result.messageId).toBeTruthy();
    });

    it('should send email with attachments', async () => {
      const params: ISendEmailParams = {
        to: 'recipient@example.com',
        subject: 'Email with Attachments',
        body: 'See attached files',
        attachments: [
          {
            filename: 'document.pdf',
            content: Buffer.from('PDF content'),
            contentType: 'application/pdf',
          },
          {
            filename: 'image.png',
            content: 'base64encodedcontent',
            contentType: 'image/png',
            encoding: 'base64',
          },
        ],
      };

      const result = await adapter.sendEmail(params);

      expect(result.messageId).toBeTruthy();
      expect(result.accepted).toContain('recipient@example.com');
    });

    it('should send email with metadata', async () => {
      const params: ISendEmailParams = {
        to: 'recipient@example.com',
        subject: 'Email with Metadata',
        body: 'Email with custom headers',
        metadata: {
          userId: '12345',
          campaignId: 'spring-2025',
          priority: 'high',
        },
      };

      const result = await adapter.sendEmail(params);

      expect(result.messageId).toBeTruthy();
    });

    it('should handle single recipient as string or array', async () => {
      const paramsString: ISendEmailParams = {
        to: 'single@example.com',
        subject: 'Single as String',
        body: 'Test',
      };

      const paramsArray: ISendEmailParams = {
        to: ['single@example.com'],
        subject: 'Single as Array',
        body: 'Test',
      };

      const result1 = await adapter.sendEmail(paramsString);
      const result2 = await adapter.sendEmail(paramsArray);

      expect(result1.accepted).toContain('single@example.com');
      expect(result2.accepted).toContain('single@example.com');
    });
  });

  describe('sendBulkEmail', () => {
    it('should send multiple emails successfully', async () => {
      const params: IBulkEmailParams = {
        emails: [
          {
            to: 'user1@example.com',
            subject: 'Email 1',
            body: 'Content 1',
          },
          {
            to: 'user2@example.com',
            subject: 'Email 2',
            body: 'Content 2',
          },
          {
            to: 'user3@example.com',
            subject: 'Email 3',
            body: 'Content 3',
          },
        ],
      };

      const result = await adapter.sendBulkEmail(params);

      expect(result).toMatchObject({
        total: 3,
        successful: 3,
        failed: 0,
        results: expect.any(Array),
      });
      expect(result.results).toHaveLength(3);
      expect(result.errors).toBeUndefined();
    });

    it('should process emails in batches', async () => {
      const emails = Array.from({ length: 25 }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Email ${i}`,
        body: `Content ${i}`,
      }));

      const params: IBulkEmailParams = {
        emails,
        batchSize: 10,
      };

      const result = await adapter.sendBulkEmail(params);

      expect(result.total).toBe(25);
      expect(result.successful).toBe(25);
      expect(result.results).toHaveLength(25);
    });

    it('should handle empty email list', async () => {
      const params: IBulkEmailParams = {
        emails: [],
      };

      const result = await adapter.sendBulkEmail(params);

      expect(result).toMatchObject({
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      });
    });

    it('should use default batch size when not specified', async () => {
      const emails = Array.from({ length: 5 }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Email ${i}`,
        body: `Content ${i}`,
      }));

      const params: IBulkEmailParams = {
        emails,
      };

      const result = await adapter.sendBulkEmail(params);

      expect(result.successful).toBe(5);
    });

    it('should handle bulk emails with attachments', async () => {
      const params: IBulkEmailParams = {
        emails: [
          {
            to: 'user1@example.com',
            subject: 'With Attachment',
            body: 'See attachment',
            attachments: [
              {
                filename: 'file1.txt',
                content: Buffer.from('content'),
                contentType: 'text/plain',
              },
            ],
          },
          {
            to: 'user2@example.com',
            subject: 'No Attachment',
            body: 'Plain email',
          },
        ],
      };

      const result = await adapter.sendBulkEmail(params);

      expect(result.successful).toBe(2);
    });
  });

  describe('validateConfig', () => {
    it('should validate adapter configuration', async () => {
      const isValid = await adapter.validateConfig();

      expect(typeof isValid).toBe('boolean');
      expect(isValid).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup adapter resources', async () => {
      await adapter.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      });

      await expect(adapter.cleanup()).resolves.not.toThrow();
    });

    it('should allow multiple cleanup calls', async () => {
      await adapter.cleanup();
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email addresses gracefully', async () => {
      const params: ISendEmailParams = {
        to: 'invalid-email',
        subject: 'Test',
        body: 'Test',
      };

      // Mock adapter doesn't validate - real adapters should
      const result = await adapter.sendEmail(params);
      expect(result).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const params = {
        to: 'test@example.com',
        // Missing subject and body
      } as ISendEmailParams;

      // Should still process (some providers allow empty subject/body)
      const result = await adapter.sendEmail(params);
      expect(result).toBeDefined();
    });
  });
});

describe('MockEmailAdapter Specific Tests', () => {
  let adapter: MockEmailAdapter;

  beforeEach(() => {
    adapter = new MockEmailAdapter();
  });

  afterEach(async () => {
    await adapter.cleanup();
  });

  describe('Test Helpers', () => {
    it('should track sent emails', async () => {
      await adapter.sendEmail({
        to: 'test1@example.com',
        subject: 'Email 1',
        body: 'Content 1',
      });

      await adapter.sendEmail({
        to: 'test2@example.com',
        subject: 'Email 2',
        body: 'Content 2',
      });

      const sentEmails = adapter.getSentEmails();

      expect(sentEmails).toHaveLength(2);
      expect(sentEmails[0].params.subject).toBe('Email 1');
      expect(sentEmails[1].params.subject).toBe('Email 2');
    });

    it('should clear sent emails', async () => {
      await adapter.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      });

      expect(adapter.getSentEmails()).toHaveLength(1);

      adapter.clearSentEmails();

      expect(adapter.getSentEmails()).toHaveLength(0);
    });

    it('should generate unique message IDs', async () => {
      const result1 = await adapter.sendEmail({
        to: 'test@example.com',
        subject: 'Email 1',
        body: 'Content 1',
      });

      const result2 = await adapter.sendEmail({
        to: 'test@example.com',
        subject: 'Email 2',
        body: 'Content 2',
      });

      expect(result1.messageId).not.toBe(result2.messageId);
    });
  });
});
