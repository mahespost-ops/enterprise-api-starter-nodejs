/**
 * Run tests for all Secrets adapter implementations
 */

import { testSecretsAdapter } from './secrets.adapter.test';
import { MemorySecretsAdapter } from '../memory.secrets.adapter';

describe('All Secrets Adapters', () => {
  // Test Memory/Mock adapter (always available)
  testSecretsAdapter('Memory', async () => {
    return new MemorySecretsAdapter();
  });

  // Additional adapters will be tested as they are implemented:
  // - GCP Secret Manager
  // - AWS Secrets Manager
  // - HashiCorp Vault
});
