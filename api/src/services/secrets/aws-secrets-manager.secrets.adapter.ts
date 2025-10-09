/**
 * AWS Secrets Manager Adapter
 *
 * Implementation using @aws-sdk/client-secrets-manager SDK.
 * Supports secret versioning, labels (tags), and metadata.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  DescribeSecretCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  TagResourceCommand,
  type Tag,
} from '@aws-sdk/client-secrets-manager';
import { getErrorMessage, isErrorWithName } from '../../constants/error-messages.constants.js';
import type {
  ISecretsAdapter,
  ISecretValue,
  ICreateSecretParams,
  ISecretMetadata,
} from './secrets.interface';
import logger from '../../config/logger';
import { NotFoundError, InternalServerError } from '../../utils/errors';

export interface AWSSecretsManagerConfig {
  region: string;
  /**
   * Optional: AWS credentials
   * If not provided, uses default credential provider chain
   */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export class AWSSecretsManagerAdapter implements ISecretsAdapter {
  private client: SecretsManagerClient;
  private region: string;

  constructor(config: AWSSecretsManagerConfig) {
    this.region = config.region;

    this.client = new SecretsManagerClient({
      region: config.region,
      credentials: config.credentials,
    });

    logger.info('AWS Secrets Manager adapter initialized', {
      region: config.region,
    });
  }

  async getSecret(name: string, version?: string): Promise<string> {
    try {
      const command = new GetSecretValueCommand({
        SecretId: name,
        VersionId: version,
        VersionStage: version ? undefined : 'AWSCURRENT', // Latest version
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new NotFoundError(`Secret value is empty: ${name}`);
      }

      logger.debug('Secret retrieved from AWS', { name, version });
      return response.SecretString;
    } catch (error: unknown) {
      if (isErrorWithName(error, 'ResourceNotFoundException')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to get secret from AWS', { name, error: errorMessage });
      throw new InternalServerError();
    }
  }

  async getSecretWithMetadata(
    name: string,
    version?: string
  ): Promise<ISecretValue> {
    try {
      // Get secret value
      const valueCommand = new GetSecretValueCommand({
        SecretId: name,
        VersionId: version,
        VersionStage: version ? undefined : 'AWSCURRENT',
      });
      const valueResponse = await this.client.send(valueCommand);

      if (!valueResponse.SecretString) {
        throw new NotFoundError(`Secret value is empty: ${name}`);
      }

      // Get secret metadata
      const describeCommand = new DescribeSecretCommand({ SecretId: name });
      const describeResponse = await this.client.send(describeCommand);

      // Convert AWS tags to labels
      const labels: Record<string, string> = {};
      if (describeResponse.Tags) {
        for (const tag of describeResponse.Tags) {
          if (tag.Key && tag.Value) {
            labels[tag.Key] = tag.Value;
          }
        }
      }

      const metadata: ISecretMetadata = {
        name: describeResponse.Name || name,
        version: valueResponse.VersionId,
        createdAt: describeResponse.CreatedDate,
        updatedAt: describeResponse.LastChangedDate,
        labels: Object.keys(labels).length > 0 ? labels : undefined,
      };

      logger.debug('Secret with metadata retrieved from AWS', { name, version });

      return {
        value: valueResponse.SecretString,
        metadata,
      };
    } catch (error: unknown) {
      if (isErrorWithName(error, 'ResourceNotFoundException')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to get secret metadata from AWS', {
        name,
        error: errorMessage,
      });
      throw new InternalServerError();
    }
  }

  async setSecret(params: ICreateSecretParams): Promise<void> {
    try {
      // Check if secret exists
      let secretExists = false;
      try {
        await this.client.send(new DescribeSecretCommand({ SecretId: params.name }));
        secretExists = true;
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'ResourceNotFoundException') {
          throw error;
        }
      }

      // Convert labels to AWS tags
      const tags: Tag[] = [];
      if (params.labels) {
        for (const [key, value] of Object.entries(params.labels)) {
          tags.push({ Key: key, Value: value });
        }
      }

      if (!secretExists) {
        // Create new secret
        const createCommand = new CreateSecretCommand({
          Name: params.name,
          SecretString: params.value,
          Description: params.description,
          Tags: tags.length > 0 ? tags : undefined,
        });

        await this.client.send(createCommand);
        logger.info('Secret created in AWS', { name: params.name });
      } else {
        // Update existing secret
        const updateCommand = new UpdateSecretCommand({
          SecretId: params.name,
          SecretString: params.value,
          Description: params.description,
        });

        await this.client.send(updateCommand);

        // Update tags if provided
        if (tags.length > 0) {
          const tagCommand = new TagResourceCommand({
            SecretId: params.name,
            Tags: tags,
          });
          await this.client.send(tagCommand);
        }

        logger.info('Secret updated in AWS', { name: params.name });
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to set secret in AWS', {
        name: params.name,
        error: errorMessage,
      });
      throw new InternalServerError();
    }
  }

  async deleteSecret(name: string): Promise<void> {
    try {
      const command = new DeleteSecretCommand({
        SecretId: name,
        ForceDeleteWithoutRecovery: true, // Immediate deletion for testing
      });

      await this.client.send(command);
      logger.info('Secret deleted from AWS', { name });
    } catch (error: unknown) {
      if (isErrorWithName(error, 'ResourceNotFoundException')) {
        throw new NotFoundError(`Secret not found: ${name}`);
      }
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to delete secret from AWS', { name, error: errorMessage });
      throw new InternalServerError();
    }
  }

  async listSecrets(): Promise<string[]> {
    try {
      const secrets: string[] = [];
      let nextToken: string | undefined;

      do {
        const command = new ListSecretsCommand({
          NextToken: nextToken,
        });

        const response = await this.client.send(command);

        if (response.SecretList) {
          for (const secret of response.SecretList) {
            if (secret.Name) {
              secrets.push(secret.Name);
            }
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      logger.debug('Secrets listed from AWS', { count: secrets.length });
      return secrets;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to list secrets from AWS', { error: errorMessage });
      throw new InternalServerError();
    }
  }

  async secretExists(name: string): Promise<boolean> {
    try {
      await this.client.send(new DescribeSecretCommand({ SecretId: name }));
      return true;
    } catch (error: unknown) {
      if (isErrorWithName(error, 'ResourceNotFoundException')) {
        return false;
      }
      const errorMessage = getErrorMessage(error);
      logger.error('Failed to check secret existence in AWS', {
        name,
        error: errorMessage,
      });
      throw new InternalServerError();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test connection by listing secrets (lightweight operation)
      await this.client.send(
        new ListSecretsCommand({
          MaxResults: 1,
        })
      );

      logger.info('AWS Secrets Manager configuration validated', {
        region: this.region,
      });
      return true;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error('AWS Secrets Manager configuration validation failed', {
        region: this.region,
        error: errorMessage,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.client.destroy();
      logger.info('AWS Secrets Manager client destroyed');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.warn('Error destroying AWS Secrets Manager client', {
        error: errorMessage,
      });
    }
  }
}
