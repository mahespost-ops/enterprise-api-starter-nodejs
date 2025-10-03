/**
 * Google Cloud Secret Manager Adapter
 *
 * Implementation using @google-cloud/secret-manager SDK.
 * Supports secret versioning, labels, and metadata.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type {
  ISecretsAdapter,
  ISecretValue,
  ICreateSecretParams,
  ISecretMetadata,
} from './secrets.interface';
import logger from '../../config/logger';
import { NotFoundError, InternalServerError } from '../../utils/errors';

export interface GCPSecretManagerConfig {
  projectId: string;
  /**
   * Optional: Path to service account key file
   * If not provided, uses Application Default Credentials
   */
  keyFilename?: string;
}

export class GCPSecretManagerAdapter implements ISecretsAdapter {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private projectPath: string;

  constructor(config: GCPSecretManagerConfig) {
    this.projectId = config.projectId;
    this.projectPath = `projects/${config.projectId}`;

    // Initialize client with optional key file
    this.client = new SecretManagerServiceClient(
      config.keyFilename ? { keyFilename: config.keyFilename } : {}
    );

    logger.info('GCP Secret Manager adapter initialized', {
      projectId: config.projectId,
    });
  }

  async getSecret(name: string, version: string = 'latest'): Promise<string> {
    try {
      const secretPath = this.getSecretVersionPath(name, version);

      const [response] = await this.client.accessSecretVersion({
        name: secretPath,
      });

      const payload = response.payload?.data;
      if (!payload) {
        throw new NotFoundError(`Secret value is empty: ${name}`);
      }

      // Convert Buffer to string
      const value = payload.toString('utf8');
      logger.debug('Secret retrieved from GCP', { name, version });

      return value;
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('not found')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to get secret from GCP', { name, error: error.message });
      throw new InternalServerError();
    }
  }

  async getSecretWithMetadata(
    name: string,
    version: string = 'latest'
  ): Promise<ISecretValue> {
    try {
      const secretPath = this.getSecretPath(name);
      const versionPath = this.getSecretVersionPath(name, version);

      // Get secret metadata
      const [secret] = await this.client.getSecret({ name: secretPath });

      // Get secret value
      const [versionResponse] = await this.client.accessSecretVersion({
        name: versionPath,
      });

      const payload = versionResponse.payload?.data;
      if (!payload) {
        throw new NotFoundError(`Secret value is empty: ${name}`);
      }

      const value = payload.toString('utf8');

      // Extract version number from version path
      const versionMatch = versionResponse.name?.match(/\/versions\/(.+)$/);
      const versionNumber = versionMatch ? versionMatch[1] : version;

      const metadata: ISecretMetadata = {
        name,
        version: versionNumber,
        createdAt: secret.createTime?.seconds
          ? new Date(Number(secret.createTime.seconds) * 1000)
          : undefined,
        labels: secret.labels || undefined,
      };

      logger.debug('Secret with metadata retrieved from GCP', { name, version });

      return { value, metadata };
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('not found')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to get secret metadata from GCP', {
        name,
        error: error.message,
      });
      throw new InternalServerError();
    }
  }

  async setSecret(params: ICreateSecretParams): Promise<void> {
    try {
      const secretPath = this.getSecretPath(params.name);

      // Check if secret exists
      let secretExists = false;
      try {
        await this.client.getSecret({ name: secretPath });
        secretExists = true;
      } catch (error: any) {
        if (error.code !== 5) {
          throw error;
        }
      }

      if (!secretExists) {
        // Create new secret
        const createRequest: any = {
          parent: this.projectPath,
          secretId: params.name,
          secret: {
            replication: {
              automatic: {},
            },
            labels: params.labels,
          },
        };

        await this.client.createSecret(createRequest);
        logger.info('Secret created in GCP', { name: params.name });
      } else if (params.labels) {
        // Update labels if provided and secret exists
        await this.client.updateSecret({
          secret: {
            name: secretPath,
            labels: params.labels,
          },
          updateMask: {
            paths: ['labels'],
          },
        });
      }

      // Add secret version (value)
      await this.client.addSecretVersion({
        parent: secretPath,
        payload: {
          data: Buffer.from(params.value, 'utf8'),
        },
      });

      logger.info('Secret version added in GCP', { name: params.name });
    } catch (error: any) {
      logger.error('Failed to set secret in GCP', {
        name: params.name,
        error: error.message,
      });
      throw new InternalServerError();
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      const secretPath = this.getSecretPath(name);
      await this.client.deleteSecret({ name: secretPath });
      logger.info('Secret deleted from GCP', { name });
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('not found')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      logger.error('Failed to delete secret from GCP', { name, error: error.message });
      throw new InternalServerError();
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const [secrets] = await this.client.listSecrets({
        parent: this.projectPath,
      });

      const secretNames = secrets.map((secret) => {
        // Extract secret ID from full path: projects/{project}/secrets/{secretId}
        const match = secret.name?.match(/\/secrets\/(.+)$/);
        return match ? match[1] : '';
      }).filter(Boolean);

      logger.debug('Secrets listed from GCP', { count: secretNames.length });
      return secretNames;
    } catch (error: any) {
      logger.error('Failed to list secrets from GCP', { error: error.message });
      throw new InternalServerError();
    }
  }

  async secretExists(name: string): Promise<boolean> {
    try {
      const secretPath = this.getSecretPath(name);
      await this.client.getSecret({ name: secretPath });
      return true;
    } catch (error: any) {
      if (error.code === 5 || error.message?.includes('not found')) {
        return false;
      }
      throw new InternalServerError();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test connection by listing secrets (lightweight operation)
      await this.client.listSecrets({
        parent: this.projectPath,
        pageSize: 1,
      });

      logger.info('GCP Secret Manager configuration validated', {
        projectId: this.projectId,
      });
      return true;
    } catch (error: any) {
      logger.error('GCP Secret Manager configuration validation failed', {
        projectId: this.projectId,
        error: error.message,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.client.close();
      logger.info('GCP Secret Manager client closed');
    } catch (error: any) {
      logger.warn('Error closing GCP Secret Manager client', { error: error.message });
    }
  }

  /**
   * Get full secret path
   */
  private getSecretPath(name: string): string {
    return `${this.projectPath}/secrets/${name}`;
  }

  /**
   * Get full secret version path
   */
  private getSecretVersionPath(name: string, version: string): string {
    return `${this.getSecretPath(name)}/versions/${version}`;
  }
}
