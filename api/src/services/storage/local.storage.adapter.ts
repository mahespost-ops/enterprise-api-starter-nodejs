/**
 * Local Storage Adapter
 *
 * Filesystem-based storage adapter for local development.
 * Stores files in a local directory.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
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
import type { ILocalStorageConfig } from '../config/adapter.config';
import logger from '../../config/logger';
import { NotFoundError } from '../../utils/errors';

export class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;
  private publicUrl?: string;

  constructor(config: ILocalStorageConfig) {
    this.basePath = path.resolve(config.basePath);
    this.publicUrl = config.publicUrl;
  }

  async uploadFile(params: IUploadParams): Promise<IUploadResult> {
    const filePath = this.getFilePath(params.key);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    const data = Buffer.isBuffer(params.data) ? params.data : Buffer.from(params.data);
    await fs.writeFile(filePath, data);

    // Store metadata
    if (params.metadata || params.contentType) {
      const metadataPath = `${filePath}.meta`;
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          contentType: params.contentType,
          metadata: params.metadata,
          cacheControl: params.cacheControl,
          uploadedAt: new Date().toISOString(),
        })
      );
    }

    const stats = await fs.stat(filePath);
    const etag = this.calculateETag(data);

    logger.info('File uploaded to local storage', {
      key: params.key,
      size: stats.size,
      path: filePath,
    });

    return {
      key: params.key,
      url: this.getPublicUrl(params.key),
      size: stats.size,
      etag,
      timestamp: stats.mtime,
    };
  }

  async downloadFile(params: IDownloadParams): Promise<Buffer> {
    const filePath = this.getFilePath(params.key);

    try {
      const data = await fs.readFile(filePath);

      logger.info('File downloaded from local storage', {
        key: params.key,
        size: data.length,
      });

      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`File not found: ${params.key}`);
      }
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const metadataPath = `${filePath}.meta`;

    try {
      await fs.unlink(filePath);

      // Try to delete metadata file if it exists
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist, that's OK
      }

      logger.info('File deleted from local storage', { key });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<IStorageMetadata> {
    const filePath = this.getFilePath(key);

    try {
      const stats = await fs.stat(filePath);
      const data = await fs.readFile(filePath);
      const etag = this.calculateETag(data);

      // Try to read metadata
      let contentType: string | undefined;
      let metadata: Record<string, string> | undefined;

      try {
        const metadataPath = `${filePath}.meta`;
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const parsed = JSON.parse(metadataContent);
        contentType = parsed.contentType;
        metadata = parsed.metadata;
      } catch {
        // No metadata file
      }

      return {
        key,
        size: stats.size,
        contentType,
        lastModified: stats.mtime,
        etag,
        metadata,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async listFiles(params?: IListParams): Promise<IListResult> {
    const prefix = params?.prefix || '';
    const maxResults = params?.maxResults || 1000;
    const searchPath = path.join(this.basePath, prefix);

    const items: IStorageMetadata[] = [];

    try {
      const files = await this.listFilesRecursive(searchPath, this.basePath);

      for (const file of files.slice(0, maxResults)) {
        // Skip metadata files
        if (file.endsWith('.meta')) continue;

        try {
          const metadata = await this.getMetadata(file);
          items.push(metadata);
        } catch {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, return empty list
    }

    logger.info('Files listed from local storage', {
      prefix,
      count: items.length,
    });

    return {
      items,
      totalCount: items.length,
      nextPageToken: items.length >= maxResults ? 'has-more' : undefined,
    };
  }

  async getSignedUrl(params: ISignedUrlParams): Promise<string> {
    // Local storage doesn't support signed URLs in the traditional sense
    // Return the public URL with a token parameter

    const token = crypto.randomBytes(32).toString('hex');
    const url = this.getPublicUrl(params.key);

    logger.warn('Local storage signed URLs are not secure', {
      key: params.key,
    });

    return `${url}?token=${token}&expires=${Date.now() + params.expirationSeconds * 1000}`;
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const sourcePath = this.getFilePath(sourceKey);
    const destPath = this.getFilePath(destinationKey);

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);

      // Copy metadata if it exists
      try {
        const sourceMetaPath = `${sourcePath}.meta`;
        const destMetaPath = `${destPath}.meta`;
        await fs.copyFile(sourceMetaPath, destMetaPath);
      } catch {
        // No metadata to copy
      }

      logger.info('File copied in local storage', {
        sourceKey,
        destinationKey,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundError(`Source file not found: ${sourceKey}`);
      }
      throw error;
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.basePath, { recursive: true });

      // Test write permissions
      const testFile = path.join(this.basePath, '.test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      logger.info('Local storage adapter configuration validated', {
        basePath: this.basePath,
      });

      return true;
    } catch (error) {
      logger.error('Local storage adapter configuration validation failed', {
        basePath: this.basePath,
        error,
      });
      return false;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up local storage adapter');
    // No persistent connections to close
  }

  // Helper methods

  private getFilePath(key: string): string {
    // Prevent directory traversal
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  private getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return `file://${this.getFilePath(key)}`;
  }

  private calculateETag(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private async listFilesRecursive(dir: string, basePath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursive(fullPath, basePath);
          files.push(...subFiles);
        } else {
          // Convert to relative path from basePath
          const relativePath = path.relative(basePath, fullPath);
          files.push(relativePath);
        }
      }
    } catch {
      // Directory might not exist or not readable
    }

    return files;
  }
}
