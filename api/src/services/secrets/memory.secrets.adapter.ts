/**
 * Memory Secrets Adapter
 *
 * In-memory implementation for testing and development.
 * All secrets are stored in memory and cleared on cleanup.
 */

import type {
  ISecretsAdapter,
  ISecretValue,
  ICreateSecretParams,
  ISecretMetadata,
} from './secrets.interface';
import logger from '../../config/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

interface StoredSecret {
  value: string;
  metadata: ISecretMetadata;
  versions: Map<string, { value: string; createdAt: Date }>;
}

export class MemorySecretsAdapter implements ISecretsAdapter {
  private secrets: Map<string, StoredSecret>;
  private versionCounter: Map<string, number>;

  constructor() {
    this.secrets = new Map();
    this.versionCounter = new Map();
  }

  async getSecret(name: string, version?: string): Promise<string> {
    const secret = this.secrets.get(name);
    if (!secret) {
      throw new NotFoundError(`Secret not found: ${name}`);
    }

    if (version && version !== 'latest') {
      const versionedValue = secret.versions.get(version);
      if (!versionedValue) {
        throw new NotFoundError(`Secret version not found: ${name}@${version}`);
      }
      logger.debug('Secret retrieved with version', { name, version });
      return versionedValue.value;
    }

    logger.debug('Secret retrieved', { name });
    return secret.value;
  }

  async getSecretWithMetadata(
    name: string,
    version?: string
  ): Promise<ISecretValue> {
    const secret = this.secrets.get(name);
    if (!secret) {
      throw new NotFoundError(`Secret not found: ${name}`);
    }

    if (version && version !== 'latest') {
      const versionedValue = secret.versions.get(version);
      if (!versionedValue) {
        throw new NotFoundError(`Secret version not found: ${name}@${version}`);
      }
      return {
        value: versionedValue.value,
        metadata: {
          ...secret.metadata,
          version,
          createdAt: versionedValue.createdAt,
        },
      };
    }

    logger.debug('Secret with metadata retrieved', { name });
    return {
      value: secret.value,
      metadata: secret.metadata,
    };
  }

  async setSecret(params: ICreateSecretParams): Promise<void> {
    if (!params.name || params.name.trim() === '') {
      throw new ValidationError([
        { field: 'name', message: 'Secret name cannot be empty', value: params.name },
      ]);
    }

    const now = new Date();
    const existingSecret = this.secrets.get(params.name);

    if (existingSecret) {
      // Update existing secret and create new version
      const currentVersion = this.versionCounter.get(params.name) || 1;
      const newVersion = currentVersion + 1;
      this.versionCounter.set(params.name, newVersion);

      // Store old value as a version
      existingSecret.versions.set(
        currentVersion.toString(),
        {
          value: existingSecret.value,
          createdAt: existingSecret.metadata.updatedAt || now,
        }
      );

      existingSecret.value = params.value;
      existingSecret.metadata.updatedAt = now;
      existingSecret.metadata.version = newVersion.toString();
      if (params.labels) {
        existingSecret.metadata.labels = params.labels;
      }

      logger.debug('Secret updated', { name: params.name, version: newVersion });
    } else {
      // Create new secret
      this.versionCounter.set(params.name, 1);

      const metadata: ISecretMetadata = {
        name: params.name,
        version: '1',
        createdAt: now,
        updatedAt: now,
        labels: params.labels,
      };

      this.secrets.set(params.name, {
        value: params.value,
        metadata,
        versions: new Map(),
      });

      logger.debug('Secret created', { name: params.name });
    }
  }

  async deleteSecret(name: string): Promise<void> {
    if (!this.secrets.has(name)) {
      throw new NotFoundError(`Secret not found: ${name}`);
    }

    this.secrets.delete(name);
    this.versionCounter.delete(name);
    logger.debug('Secret deleted', { name });
  }

  async listSecrets(): Promise<string[]> {
    const names = Array.from(this.secrets.keys());
    logger.debug('Secrets listed', { count: names.length });
    return names;
  }

  async secretExists(name: string): Promise<boolean> {
    return this.secrets.has(name);
  }

  async validateConfig(): Promise<boolean> {
    logger.debug('Memory secrets adapter configuration valid');
    return true;
  }

  async cleanup(): Promise<void> {
    this.secrets.clear();
    this.versionCounter.clear();
    logger.debug('Memory secrets adapter cleaned up');
  }

  /**
   * Get all stored secrets (for testing only)
   */
  getAll(): Map<string, StoredSecret> {
    return new Map(this.secrets);
  }

  /**
   * Get secret count (for testing only)
   */
  count(): number {
    return this.secrets.size;
  }
}
