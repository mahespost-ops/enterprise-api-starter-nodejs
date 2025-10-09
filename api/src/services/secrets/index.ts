/**
 * Secrets Service Exports
 *
 * Centralized exports for all secrets adapter implementations.
 * Provides a provider-agnostic interface for secure storage and retrieval
 * of sensitive configuration values.
 */

// Interface and types
export type {
  ISecretsAdapter,
  ISecretValue,
  ISecretMetadata,
  ICreateSecretParams,
} from './secrets.interface';

// Adapter implementations
export { MemorySecretsAdapter } from './memory.secrets.adapter';
export { EnvSecretsAdapter } from './env.secrets.adapter';
export { FileSecretsAdapter } from './file.secrets.adapter';
export {
  GCPSecretManagerAdapter,
  type GCPSecretManagerConfig,
} from './gcp-secret-manager.secrets.adapter';
export {
  AWSSecretsManagerAdapter,
  type AWSSecretsManagerConfig,
} from './aws-secrets-manager.secrets.adapter';
export {
  VaultSecretsAdapter,
  type VaultConfig,
} from './vault.secrets.adapter';
