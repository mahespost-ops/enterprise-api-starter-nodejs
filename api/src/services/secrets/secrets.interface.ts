/**
 * Secrets Adapter Interface
 *
 * Provides a provider-agnostic interface for secure storage and retrieval
 * of sensitive configuration values like API keys, database passwords, etc.
 */

export interface ISecretMetadata {
  name: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  labels?: Record<string, string>;
}

export interface ISecretValue {
  value: string;
  metadata: ISecretMetadata;
}

export interface ICreateSecretParams {
  name: string;
  value: string;
  labels?: Record<string, string>;
  description?: string;
}

export interface ISecretsAdapter {
  /**
   * Retrieve a secret value by name
   * @param name - Secret identifier
   * @param version - Optional version (defaults to latest)
   */
  getSecret(name: string, version?: string): Promise<string>;

  /**
   * Retrieve secret with metadata
   */
  getSecretWithMetadata(name: string, version?: string): Promise<ISecretValue>;

  /**
   * Create or update a secret
   */
  setSecret(params: ICreateSecretParams): Promise<void>;

  /**
   * Delete a secret and all its versions
   */
  deleteSecret(name: string): Promise<void>;

  /**
   * List all secret names
   */
  listSecrets(): Promise<string[]>;

  /**
   * Check if a secret exists
   */
  secretExists(name: string): Promise<boolean>;

  /**
   * Validate configuration and connectivity
   */
  validateConfig(): Promise<boolean>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}
