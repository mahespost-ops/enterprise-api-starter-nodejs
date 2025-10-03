/**
 * Google Cloud Storage Adapter
 *
 * Implements the storage interface using Google Cloud Storage.
 * Supports all GCS features including signed URLs and metadata.
 */

import { Storage, Bucket, File, GetSignedUrlConfig } from '@google-cloud/storage';
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
import type { IGoogleCloudStorageConfig } from '../config/adapter.config';
import logger from '../../config/logger';
import { NotFoundError } from '../../utils/errors';

export class GoogleCloudStorageAdapter implements IStorageAdapter {
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;

  constructor(config: IGoogleCloudStorageConfig) {
    this.bucketName = config.bucketName;

    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
      credentials: config.credentials,
    });

    this.bucket = this.storage.bucket(this.bucketName);
  }

  async uploadFile(params: IUploadParams): Promise<IUploadResult> {
    const file = this.bucket.file(params.key);
    const data = Buffer.isBuffer(params.data) ? params.data : Buffer.from(params.data);

    const options: {
      metadata?: {
        contentType?: string;
        cacheControl?: string;
        metadata?: Record<string, string>;
      };
      predefinedAcl?: string;
    } = {};

    if (params.contentType || params.cacheControl || params.metadata) {
      options.metadata = {
        contentType: params.contentType,
        cacheControl: params.cacheControl,
        metadata: params.metadata,
      };
    }

    // Map ACL to GCS predefinedAcl
    if (params.acl) {
      const aclMap: Record<string, string> = {
        private: 'private',
        'public-read': 'publicRead',
        'authenticated-read': 'authenticatedRead',
      };
      options.predefinedAcl = aclMap[params.acl] || 'private';
    }

    await file.save(data, options as any);

    // Get metadata after upload
    const [metadata] = await file.getMetadata();

    logger.info('File uploaded to Google Cloud Storage', {
      key: params.key,
      bucket: this.bucketName,
      size: metadata.size,
    });

    return {
      key: params.key,
      url: `https://storage.googleapis.com/${this.bucketName}/${params.key}`,
      size: parseInt(metadata.size as string),
      etag: metadata.etag || metadata.md5Hash || '',
      timestamp: new Date((metadata.updated || metadata.timeCreated || Date.now()) as any),
    };
  }

  async downloadFile(params: IDownloadParams): Promise<Buffer> {
    const file = this.bucket.file(params.key);

    try {
      const [buffer] = await file.download(
        params.versionId ? ({ generation: params.versionId } as any) : undefined
      );

      logger.info('File downloaded from Google Cloud Storage', {
        key: params.key,
        bucket: this.bucketName,
        size: buffer.length,
      });

      return buffer;
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        throw new NotFoundError(`File not found: ${params.key}`);
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const file = this.bucket.file(key);

    try {
      await file.delete();

      logger.info('File deleted from Google Cloud Storage', {
        key,
        bucket: this.bucketName,
      });
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const file = this.bucket.file(key);

    try {
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<IStorageMetadata> {
    const file = this.bucket.file(key);

    try {
      const [metadata] = await file.getMetadata();

      return {
        key,
        size: parseInt(metadata.size as string),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated || metadata.timeCreated || Date.now()),
        etag: metadata.etag || metadata.md5Hash || '',
        metadata: metadata.metadata as Record<string, string> | undefined,
      };
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async listFiles(params?: IListParams): Promise<IListResult> {
    const options: {
      prefix?: string;
      maxResults?: number;
      pageToken?: string;
      autoPaginate?: boolean;
    } = {
      prefix: params?.prefix,
      maxResults: params?.maxResults,
      pageToken: params?.pageToken,
      autoPaginate: false,
    };

    const [files, query] = await this.bucket.getFiles(options);

    const items: IStorageMetadata[] = files.map((file: File) => {
      const metadata = file.metadata;
      return {
        key: file.name,
        size: parseInt(metadata.size as string),
        contentType: metadata.contentType,
        lastModified: new Date(metadata.updated || metadata.timeCreated || Date.now()),
        etag: metadata.etag || metadata.md5Hash || '',
        metadata: metadata.metadata as Record<string, string> | undefined,
      };
    });

    logger.info('Files listed from Google Cloud Storage', {
      bucket: this.bucketName,
      prefix: params?.prefix,
      count: items.length,
    });

    return {
      items,
      totalCount: items.length,
      nextPageToken: query?.pageToken,
    };
  }

  async getSignedUrl(params: ISignedUrlParams): Promise<string> {
    const file = this.bucket.file(params.key);

    const actionMap: Record<string, string> = {
      read: 'read',
      write: 'write',
      delete: 'delete',
    };

    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: (actionMap[params.action || 'read'] as 'read' | 'write' | 'delete') || 'read',
      expires: Date.now() + params.expirationSeconds * 1000,
    };

    if (params.contentType) {
      options.contentType = params.contentType;
    }

    const [signedUrl] = await file.getSignedUrl(options);

    logger.info('Signed URL generated for Google Cloud Storage', {
      key: params.key,
      action: params.action || 'read',
      expirationSeconds: params.expirationSeconds,
    });

    return signedUrl;
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const sourceFile = this.bucket.file(sourceKey);
    const destFile = this.bucket.file(destinationKey);

    try {
      await sourceFile.copy(destFile);

      logger.info('File copied in Google Cloud Storage', {
        bucket: this.bucketName,
        sourceKey,
        destinationKey,
      });
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 404) {
        throw new NotFoundError(`Source file not found: ${sourceKey}`);
      }
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Check if bucket exists
      const [exists] = await this.bucket.exists();

      if (!exists) {
        logger.error('Google Cloud Storage bucket does not exist', {
          bucket: this.bucketName,
        });
        return false;
      }

      // Test write permissions by creating and deleting a test file
      const testFile = this.bucket.file('.config-test');
      await testFile.save('test');
      await testFile.delete();

      logger.info('Google Cloud Storage adapter configuration validated', {
        bucket: this.bucketName,
      });

      return true;
    } catch (error) {
      logger.error('Google Cloud Storage adapter configuration validation failed', {
        bucket: this.bucketName,
        error,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Google Cloud Storage adapter');
    // GCS client doesn't require explicit cleanup
  }
}
