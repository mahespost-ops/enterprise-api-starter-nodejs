/**
 * AWS S3 Storage Adapter
 *
 * Implements the storage interface using AWS S3.
 * Supports all S3 features including presigned URLs and metadata.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  type PutObjectCommandInput,
  type HeadObjectCommandOutput,
  type ListObjectsV2CommandOutput,
  type _Object,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  IStorageAdapter,
  IUploadParams,
  IUploadResult,
  IDownloadParams,
  IStorageMetadata,
  IListParams,
  IListResult,
  ISignedUrlParams,
} from './storage.interface';
import type { IAWSS3Config } from '../config/adapter.config';
import logger from '../../config/logger';
import { NotFoundError } from '../../utils/errors';

export class S3StorageAdapter implements IStorageAdapter {
  private client: S3Client;
  private bucketName: string;

  constructor(config: IAWSS3Config) {
    this.bucketName = config.bucketName;

    this.client = new S3Client({
      region: config.region,
      credentials: config.credentials
        ? {
            accessKeyId: config.credentials.accessKeyId,
            secretAccessKey: config.credentials.secretAccessKey,
            sessionToken: config.credentials.sessionToken,
          }
        : undefined,
      endpoint: config.endpoint,
    });
  }

  async uploadFile(params: IUploadParams): Promise<IUploadResult> {
    const data = Buffer.isBuffer(params.data) ? params.data : Buffer.from(params.data);

    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: params.key,
      Body: data,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
      Metadata: params.metadata,
      ACL: params.acl ? (this.mapAcl(params.acl) as any) : undefined,
    };

    // Use Upload for better performance with large files
    const upload = new Upload({
      client: this.client,
      params: uploadParams,
    });

    const result = await upload.done();

    logger.info('File uploaded to AWS S3', {
      key: params.key,
      bucket: this.bucketName,
      size: data.length,
    });

    return {
      key: params.key,
      url: `https://${this.bucketName}.s3.amazonaws.com/${params.key}`,
      size: data.length,
      etag: result.ETag?.replace(/"/g, '') || '',
      timestamp: new Date(),
    };
  }

  async downloadFile(params: IDownloadParams): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: params.key,
      VersionId: params.versionId,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      // @ts-expect-error - AWS SDK stream types are complex
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      logger.info('File downloaded from AWS S3', {
        key: params.key,
        bucket: this.bucketName,
        size: buffer.length,
      });

      return buffer;
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'NoSuchKey') {
        throw new NotFoundError(`File not found: ${params.key}`);
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);

      logger.info('File deleted from AWS S3', {
        key,
        bucket: this.bucketName,
      });
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'NoSuchKey') {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<IStorageMetadata> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response: HeadObjectCommandOutput = await this.client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag?.replace(/"/g, '') || '',
        metadata: response.Metadata,
      };
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'NotFound') {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async listFiles(params?: IListParams): Promise<IListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: params?.prefix,
      MaxKeys: params?.maxResults,
      ContinuationToken: params?.pageToken,
    });

    const response: ListObjectsV2CommandOutput = await this.client.send(command);

    const items: IStorageMetadata[] = (response.Contents || []).map((obj: _Object) => ({
      key: obj.Key || '',
      size: obj.Size || 0,
      contentType: undefined, // S3 ListObjects doesn't return content type
      lastModified: obj.LastModified || new Date(),
      etag: obj.ETag?.replace(/"/g, '') || '',
      metadata: undefined,
    }));

    logger.info('Files listed from AWS S3', {
      bucket: this.bucketName,
      prefix: params?.prefix,
      count: items.length,
    });

    return {
      items,
      totalCount: items.length,
      nextPageToken: response.NextContinuationToken,
    };
  }

  async getSignedUrl(params: ISignedUrlParams): Promise<string> {
    let command;

    switch (params.action || 'read') {
      case 'write':
        command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: params.key,
          ContentType: params.contentType,
        });
        break;
      case 'delete':
        command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: params.key,
        });
        break;
      case 'read':
      default:
        command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: params.key,
        });
        break;
    }

    const signedUrl = await awsGetSignedUrl(this.client, command, {
      expiresIn: params.expirationSeconds,
    });

    logger.info('Signed URL generated for AWS S3', {
      key: params.key,
      action: params.action || 'read',
      expirationSeconds: params.expirationSeconds,
    });

    return signedUrl;
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${sourceKey}`,
      Key: destinationKey,
    });

    try {
      await this.client.send(command);

      logger.info('File copied in AWS S3', {
        bucket: this.bucketName,
        sourceKey,
        destinationKey,
      });
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'NoSuchKey') {
        throw new NotFoundError(`Source file not found: ${sourceKey}`);
      }
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test access by listing with maxKeys=1
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1,
      });

      await this.client.send(command);

      logger.info('AWS S3 adapter configuration validated', {
        bucket: this.bucketName,
      });

      return true;
    } catch (error) {
      logger.error('AWS S3 adapter configuration validation failed', {
        bucket: this.bucketName,
        error,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up AWS S3 adapter');
    this.client.destroy();
  }

  // Helper methods

  private mapAcl(acl: 'private' | 'public-read' | 'authenticated-read'): string {
    const aclMap: Record<string, string> = {
      private: 'private',
      'public-read': 'public-read',
      'authenticated-read': 'authenticated-read',
    };
    return aclMap[acl] || 'private';
  }
}
