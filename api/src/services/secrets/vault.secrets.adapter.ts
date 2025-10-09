/**
 * HashiCorp Vault Adapter
 *
 * Implementation using @litehex/node-vault SDK.
 * Supports KV v2 secrets engine with versioning and metadata.
 */

import { Client as VaultClient } from '@litehex/node-vault';
import type {
  ISecretsAdapter,
  ISecretValue,
  ICreateSecretParams,
  ISecretMetadata,
} from './secrets.interface';
import logger from '../../config/logger';
import { NotFoundError, InternalServerError } from '../../utils/errors';
import { getErrorMessage } from '../../constants/error-messages.constants.js';

export interface VaultConfig {
  /**
   * Vault server address (e.g., 'http://localhost:8200')
   */
  endpoint: string;

  /**
   * Authentication token
   */
  token: string;

  /**
   * KV secrets engine mount path (default: 'secret')
   */
  mountPath?: string;

  /**
   * Optional: API version (default: 'v1')
   */
  apiVersion?: string;
}

export class VaultSecretsAdapter implements ISecretsAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private mountPath: string;

  constructor(config: VaultConfig) {
    this.mountPath = config.mountPath || 'secret';

    this.client = new VaultClient({
      endpoint: config.endpoint,
      token: config.token,
      apiVersion: config.apiVersion || 'v1',
    });

    logger.info('Vault adapter initialized', {
      endpoint: config.endpoint,
      mountPath: this.mountPath,
    });
  }

  async getSecret(name: string, version?: string): Promise<string> {
    try {
      const path = `${this.mountPath}/data/${name}`;

      // KV v2 API uses /data/ in path
      const response = await this.client.read(path, {
        version: version ? parseInt(version, 10) : undefined,
      });

      if (!response?.data?.data) {
        throw new NotFoundError(`Secret not found or empty: ${name}`);
      }

      // KV v2 stores actual secret in data.data
      const secretData = response.data.data;

      // If secret has a 'value' field, return it; otherwise return whole object as JSON
      const value =
        typeof secretData === 'object' && 'value' in secretData
          ? secretData.value
          : JSON.stringify(secretData);

      logger.debug('Secret retrieved from Vault', { name, version });
      return value;
    } catch (error: unknown) {
      if (
        (error as { response?: { statusCode?: number } }).response?.statusCode === 404 ||
        getErrorMessage(error).includes('not found')
      ) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to get secret from Vault', { name, error: getErrorMessage(error) });
      throw new InternalServerError();
    }
  }

  async getSecretWithMetadata(
    name: string,
    version?: string
  ): Promise<ISecretValue> {
    try {
      const dataPath = `${this.mountPath}/data/${name}`;
      const metadataPath = `${this.mountPath}/metadata/${name}`;

      // Get secret value
      const dataResponse = await this.client.read(dataPath, {
        version: version ? parseInt(version, 10) : undefined,
      });

      if (!dataResponse?.data?.data) {
        throw new NotFoundError(`Secret not found or empty: ${name}`);
      }

      // Get metadata
      const metadataResponse = await this.client.read(metadataPath);

      const secretData = dataResponse.data.data;
      const value =
        typeof secretData === 'object' && 'value' in secretData
          ? secretData.value
          : JSON.stringify(secretData);

      const versionNumber =
        version || dataResponse.data.metadata?.version?.toString() || 'latest';

      // Extract custom metadata (Vault KV v2 supports custom_metadata)
      const customMetadata = metadataResponse?.data?.custom_metadata || {};

      const metadata: ISecretMetadata = {
        name,
        version: versionNumber,
        createdAt: metadataResponse?.data?.created_time
          ? new Date(metadataResponse.data.created_time)
          : undefined,
        updatedAt: metadataResponse?.data?.updated_time
          ? new Date(metadataResponse.data.updated_time)
          : undefined,
        labels: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
      };

      logger.debug('Secret with metadata retrieved from Vault', { name, version });

      return { value, metadata };
    } catch (error: unknown) {
      if (
        (error as { response?: { statusCode?: number } }).response?.statusCode === 404 ||
        getErrorMessage(error).includes('not found')
      ) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to get secret metadata from Vault', {
        name,
        error: getErrorMessage(error),
      });
      throw new InternalServerError();
    }
  }

  async setSecret(params: ICreateSecretParams): Promise<void> {
    try {
      const path = `${this.mountPath}/data/${params.name}`;

      // Prepare secret data
      // Store as {value: <actual-value>} for consistency
      const data = {
        value: params.value,
      };

      // Write secret (KV v2 automatically versions)
      await this.client.write(path, {
        data,
      });

      // Update custom metadata if labels provided
      if (params.labels || params.description) {
        const metadataPath = `${this.mountPath}/metadata/${params.name}`;

        const customMetadata: Record<string, string> = {
          ...params.labels,
        };

        if (params.description) {
          customMetadata.description = params.description;
        }

        try {
          await this.client.write(metadataPath, {
            custom_metadata: customMetadata,
          });
        } catch (error: unknown) {
          // Some Vault versions may not support custom_metadata
          logger.warn('Failed to set custom metadata in Vault', {
            name: params.name,
            error: getErrorMessage(error),
          });
        }
      }

      logger.info('Secret set in Vault', { name: params.name });
    } catch (error: unknown) {
      logger.error('Failed to set secret in Vault', {
        name: params.name,
        error: getErrorMessage(error),
      });
      throw new InternalServerError();
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      const metadataPath = `${this.mountPath}/metadata/${name}`;

      // Delete all versions by deleting metadata (permanent deletion)
      await this.client.delete(metadataPath);

      logger.info('Secret deleted from Vault', { name });
    } catch (error: unknown) {
      if (
        (error as { response?: { statusCode?: number } }).response?.statusCode === 404 ||
        getErrorMessage(error).includes('not found')
      ) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to delete secret from Vault', { name, error: getErrorMessage(error) });
      throw new InternalServerError();
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const metadataPath = `${this.mountPath}/metadata`;

      const response = await this.client.list(metadataPath);

      const keys = response?.data?.keys || [];

      logger.debug('Secrets listed from Vault', { count: keys.length });
      return keys;
    } catch (error: unknown) {
      // Empty list is not an error
      if ((error as { response?: { statusCode?: number } }).response?.statusCode === 404) {
        return [];
      }
      logger.error('Failed to list secrets from Vault', { error: getErrorMessage(error) });
      throw new InternalServerError();
    }
  }

  async secretExists(name: string): Promise<boolean> {
    try {
      const metadataPath = `${this.mountPath}/metadata/${name}`;
      await this.client.read(metadataPath);
      return true;
    } catch (error: unknown) {
      if (
        (error as { response?: { statusCode?: number } }).response?.statusCode === 404 ||
        getErrorMessage(error).includes('not found')
      ) {
        return false;
      }
      logger.error('Failed to check secret existence in Vault', {
        name,
        error: getErrorMessage(error),
      });
      throw new InternalServerError();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test connection by checking health endpoint
      await this.client.health();

      logger.info('Vault configuration validated');
      return true;
    } catch (error: unknown) {
      logger.error('Vault configuration validation failed', { error: getErrorMessage(error) });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    // node-vault doesn't require explicit cleanup
    logger.info('Vault adapter cleaned up');
  }
}
