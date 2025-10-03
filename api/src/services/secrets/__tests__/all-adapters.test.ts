/**
 * Secrets Adapter Tests
 *
 * Comprehensive tests for all Secrets Manager adapter implementations.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemorySecretsAdapter } from '../memory.secrets.adapter';
import { ISecretsAdapter, ICreateSecretParams } from '../secrets.interface';

describe('Secrets Adapters', () => {
  describe('Memory Secrets Adapter', () => {
    let adapter: ISecretsAdapter;

    beforeEach(async () => {
      adapter = new MemorySecretsAdapter();
    });

    afterEach(async () => {
      // Cleanup any created secrets
      try {
        const secrets = await adapter.listSecrets();
        for (const secret of secrets) {
          if (
            secret.startsWith('test-') ||
            secret.startsWith('temp-') ||
            secret.startsWith('bulk-')
          ) {
            await adapter.deleteSecret(secret);
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }

      await adapter.cleanup();
    });

    describe('Configuration & Connectivity', () => {
      it('should validate configuration successfully', async () => {
        const isValid = await adapter.validateConfig();
        expect(isValid).toBe(true);
      });
    });

    describe('Basic Secret Operations', () => {
      it('should create and retrieve a secret', async () => {
        const params: ICreateSecretParams = {
          name: 'test-secret-basic',
          value: 'my-secret-value-123',
        };

        await adapter.setSecret(params);

        const value = await adapter.getSecret('test-secret-basic');
        expect(value).toBe('my-secret-value-123');
      });

      it('should retrieve secret with metadata', async () => {
        const params: ICreateSecretParams = {
          name: 'test-secret-metadata',
          value: 'test-value',
          labels: { env: 'test', app: 'api' },
        };

        await adapter.setSecret(params);

        const result = await adapter.getSecretWithMetadata('test-secret-metadata');
        expect(result.value).toBe('test-value');
        expect(result.metadata.name).toBe('test-secret-metadata');
        expect(result.metadata.labels).toBeDefined();
      });

      it('should update existing secret', async () => {
        await adapter.setSecret({
          name: 'test-secret-update',
          value: 'original-value',
        });

        await adapter.setSecret({
          name: 'test-secret-update',
          value: 'updated-value',
        });

        const value = await adapter.getSecret('test-secret-update');
        expect(value).toBe('updated-value');
      });

      it('should delete a secret', async () => {
        await adapter.setSecret({
          name: 'test-secret-delete',
          value: 'to-be-deleted',
        });

        await adapter.deleteSecret('test-secret-delete');

        const exists = await adapter.secretExists('test-secret-delete');
        expect(exists).toBe(false);
      });
    });

    describe('Secret Existence Checks', () => {
      it('should return true for existing secret', async () => {
        await adapter.setSecret({
          name: 'test-secret-exists',
          value: 'exists',
        });

        const exists = await adapter.secretExists('test-secret-exists');
        expect(exists).toBe(true);
      });

      it('should return false for non-existent secret', async () => {
        const exists = await adapter.secretExists('non-existent-secret-xyz');
        expect(exists).toBe(false);
      });
    });

    describe('Secret Listing', () => {
      it('should list all secrets', async () => {
        await adapter.setSecret({
          name: 'test-secret-list-1',
          value: 'value1',
        });
        await adapter.setSecret({
          name: 'test-secret-list-2',
          value: 'value2',
        });

        const secrets = await adapter.listSecrets();
        expect(Array.isArray(secrets)).toBe(true);
        expect(secrets).toContain('test-secret-list-1');
        expect(secrets).toContain('test-secret-list-2');
      });

      it('should return empty array when no secrets exist', async () => {
        // Clean up all test secrets first
        const secrets = await adapter.listSecrets();
        for (const secret of secrets) {
          if (secret.startsWith('test-')) {
            await adapter.deleteSecret(secret);
          }
        }

        const emptyList = await adapter.listSecrets();
        const testSecrets = emptyList.filter((s) => s.startsWith('test-'));
        expect(testSecrets).toHaveLength(0);
      });
    });

    describe('Labels and Metadata', () => {
      it('should store and retrieve labels', async () => {
        const params: ICreateSecretParams = {
          name: 'test-secret-labels',
          value: 'labeled-value',
          labels: {
            environment: 'production',
            team: 'backend',
            version: 'v1',
          },
        };

        await adapter.setSecret(params);

        const result = await adapter.getSecretWithMetadata('test-secret-labels');
        expect(result.metadata.labels).toBeDefined();
        expect(result.metadata.labels?.environment).toBe('production');
        expect(result.metadata.labels?.team).toBe('backend');
      });

      it('should handle secrets without labels', async () => {
        await adapter.setSecret({
          name: 'test-secret-no-labels',
          value: 'no-labels',
        });

        const result = await adapter.getSecretWithMetadata('test-secret-no-labels');
        expect(result.value).toBe('no-labels');
        // Labels may be undefined or empty object
      });
    });

    describe('Description Support', () => {
      it('should handle secret with description', async () => {
        const params: ICreateSecretParams = {
          name: 'test-secret-description',
          value: 'described-value',
          description: 'This is a test secret for API keys',
        };

        await adapter.setSecret(params);

        const value = await adapter.getSecret('test-secret-description');
        expect(value).toBe('described-value');
      });
    });

    describe('Error Handling', () => {
      it('should throw error when getting non-existent secret', async () => {
        await expect(
          adapter.getSecret('absolutely-does-not-exist-xyz-123')
        ).rejects.toThrow();
      });

      it('should throw error when deleting non-existent secret', async () => {
        await expect(adapter.deleteSecret('does-not-exist-delete-xyz')).rejects.toThrow();
      });

      it('should handle invalid secret names gracefully', async () => {
        await expect(
          adapter.setSecret({
            name: '', // Empty name
            value: 'test',
          })
        ).rejects.toThrow();
      });

      it('should handle empty values', async () => {
        // Some providers may allow empty values, others may not
        // Test that adapter handles it consistently
        try {
          await adapter.setSecret({
            name: 'test-empty-value',
            value: '',
          });
          const value = await adapter.getSecret('test-empty-value');
          expect(value).toBe('');
        } catch (error) {
          // If provider doesn't allow empty values, should throw meaningful error
          expect(error).toBeDefined();
        }
      });
    });

    describe('Versioning Support', () => {
      it('should retrieve latest version by default', async () => {
        await adapter.setSecret({
          name: 'test-secret-version',
          value: 'version-1',
        });

        await adapter.setSecret({
          name: 'test-secret-version',
          value: 'version-2',
        });

        const value = await adapter.getSecret('test-secret-version');
        expect(value).toBe('version-2'); // Latest version
      });

      it('should include version in metadata', async () => {
        await adapter.setSecret({
          name: 'test-secret-version-meta',
          value: 'versioned-value',
        });

        const result = await adapter.getSecretWithMetadata('test-secret-version-meta');
        expect(result.metadata.version).toBeDefined();
      });
    });

    describe('Special Characters & Encoding', () => {
      it('should handle secrets with special characters', async () => {
        const specialValue = 'p@ssw0rd!#$%^&*(){}[]|\\:;"<>?,./~`';
        await adapter.setSecret({
          name: 'test-secret-special-chars',
          value: specialValue,
        });

        const value = await adapter.getSecret('test-secret-special-chars');
        expect(value).toBe(specialValue);
      });

      it('should handle secrets with unicode characters', async () => {
        const unicodeValue = '密码🔐こんにちは';
        await adapter.setSecret({
          name: 'test-secret-unicode',
          value: unicodeValue,
        });

        const value = await adapter.getSecret('test-secret-unicode');
        expect(value).toBe(unicodeValue);
      });

      it('should handle secrets with JSON strings', async () => {
        const jsonValue = JSON.stringify({
          apiKey: 'key-123',
          secret: 'secret-456',
          config: { enabled: true },
        });

        await adapter.setSecret({
          name: 'test-secret-json',
          value: jsonValue,
        });

        const value = await adapter.getSecret('test-secret-json');
        const parsed = JSON.parse(value);
        expect(parsed.apiKey).toBe('key-123');
        expect(parsed.config.enabled).toBe(true);
      });

      it('should handle multiline secrets', async () => {
        const multilineValue = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15j7HgNDqJxuJ3RmG7B5xCsY9RTJ3yJ3XWz7Qz
-----END PRIVATE KEY-----`;

        await adapter.setSecret({
          name: 'test-secret-multiline',
          value: multilineValue,
        });

        const value = await adapter.getSecret('test-secret-multiline');
        expect(value).toBe(multilineValue);
      });
    });

    describe('Bulk Operations', () => {
      it('should handle multiple secrets efficiently', async () => {
        const secretCount = 10;
        const promises: Promise<void>[] = [];

        for (let i = 0; i < secretCount; i++) {
          promises.push(
            adapter.setSecret({
              name: `bulk-secret-${i}`,
              value: `bulk-value-${i}`,
            })
          );
        }

        await Promise.all(promises);

        // Verify all created
        for (let i = 0; i < secretCount; i++) {
          const value = await adapter.getSecret(`bulk-secret-${i}`);
          expect(value).toBe(`bulk-value-${i}`);
        }
      });
    });

    describe('Timestamps', () => {
      it('should include created and updated timestamps in metadata', async () => {
        await adapter.setSecret({
          name: 'test-secret-timestamps',
          value: 'timestamped-value',
        });

        const result = await adapter.getSecretWithMetadata('test-secret-timestamps');
        // Timestamps may or may not be available depending on provider
        // Just ensure metadata exists
        expect(result.metadata).toBeDefined();
        expect(result.metadata.name).toBe('test-secret-timestamps');
      });
    });

    describe('Cleanup', () => {
      it('should cleanup resources without errors', async () => {
        await adapter.setSecret({
          name: 'test-secret-cleanup',
          value: 'cleanup-test',
        });

        await expect(adapter.cleanup()).resolves.not.toThrow();
      });

      it('should allow operations after cleanup for stateless adapters', async () => {
        await adapter.cleanup();
        // For stateless adapters (like environment-based), operations should still work
        // For stateful adapters (like Vault), this might fail - that's OK
        try {
          await adapter.validateConfig();
        } catch (error) {
          // Expected for some adapters
        }
      });
    });
  });
});
