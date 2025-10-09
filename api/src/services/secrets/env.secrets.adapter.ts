/**
 * Environment Secrets Adapter
 *
 * Simple secrets adapter that reads from environment variables.
 * Suitable for local development and simple deployments.
 */

import type {
  ISecretsAdapter,
  ISecretValue,
  ICreateSecretParams,
} from './secrets.interface';
import logger from '../../config/logger';
import { NotFoundError } from '../../utils/errors';

export class EnvSecretsAdapter implements ISecretsAdapter {
  private prefix: string;
  private cache: Map<string, string>;

  constructor(prefix = 'SECRET_') {
    this.prefix = prefix;
    this.cache = new Map();
  }

  async getSecret(name: string, version?: string): Promise<string> {
    if (version && version !== 'latest') {
      logger.warn('Environment secrets do not support versioning', { name, version });
    }

    const envKey = this.getEnvKey(name);
    const value = process.env[envKey];

    if (!value) {
      throw new NotFoundError(`Secret not found: ${name}`);
    }

    logger.info('Secret retrieved', { name, envKey });
    return value;
  }

  async getSecretWithMetadata(name: string, version?: string): Promise<ISecretValue> {
    const value = await this.getSecret(name, version);

    return {
      value,
      metadata: {
        name,
        version: version || 'latest',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  async setSecret(params: ICreateSecretParams): Promise<void> {
    logger.warn('Setting secrets in environment is not persistent', {
      name: params.name,
    });

    const envKey = this.getEnvKey(params.name);
    process.env[envKey] = params.value;
    this.cache.set(params.name, params.value);

    logger.info('Secret set in memory (not persistent)', {
      name: params.name,
      envKey,
    });
  }

  async deleteSecret(name: string): Promise<void> {
    const envKey = this.getEnvKey(name);

    delete process.env[envKey];
    this.cache.delete(name);

    logger.info('Secret deleted from memory', { name, envKey });
  }

  async listSecrets(): Promise<string[]> {
    const secrets: string[] = [];

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith(this.prefix)) {
        const secretName = key.substring(this.prefix.length);
        secrets.push(secretName);
      }
    });

    logger.info('Secrets listed', { count: secrets.length });
    return secrets;
  }

  async secretExists(name: string): Promise<boolean> {
    const envKey = this.getEnvKey(name);
    return envKey in process.env;
  }

  async validateConfig(): Promise<boolean> {
    logger.info('Validating environment secrets adapter configuration', {
      prefix: this.prefix,
    });
    return true;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up environment secrets adapter');
    this.cache.clear();
  }

  /**
   * Convert secret name to environment variable key
   */
  private getEnvKey(name: string): string {
    // Replace hyphens and dots with underscores, convert to uppercase
    const normalized = name.replace(/[-\.]/g, '_').toUpperCase();
    return `${this.prefix}${normalized}`;
  }
}
