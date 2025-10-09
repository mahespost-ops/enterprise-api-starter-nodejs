/**
 * Storage Adapter Interface
 *
 * Provides a provider-agnostic interface for object storage operations.
 * Supports file uploads, downloads, signed URLs, and metadata management.
 */

export interface IUploadParams {
  key: string;
  data: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  acl?: 'private' | 'public-read' | 'authenticated-read';
}

export interface IUploadResult {
  key: string;
  url: string;
  size: number;
  etag: string;
  timestamp: Date;
}

export interface IDownloadParams {
  key: string;
  versionId?: string;
}

export interface IStorageMetadata {
  key: string;
  size: number;
  contentType?: string;
  lastModified: Date;
  etag: string;
  metadata?: Record<string, string>;
}

export interface IListParams {
  prefix?: string;
  maxResults?: number;
  pageToken?: string;
}

export interface IListResult {
  items: IStorageMetadata[];
  nextPageToken?: string;
  totalCount: number;
}

export interface ISignedUrlParams {
  key: string;
  expirationSeconds: number;
  action?: 'read' | 'write' | 'delete';
  contentType?: string;
}

export interface IStorageAdapter {
  /**
   * Upload a file to storage
   */
  uploadFile(params: IUploadParams): Promise<IUploadResult>;

  /**
   * Download a file from storage
   */
  downloadFile(params: IDownloadParams): Promise<Buffer>;

  /**
   * Delete a file from storage
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Get file metadata without downloading
   */
  getMetadata(key: string): Promise<IStorageMetadata>;

  /**
   * List files with optional prefix filtering
   */
  listFiles(params?: IListParams): Promise<IListResult>;

  /**
   * Generate a signed URL for temporary access
   */
  getSignedUrl(params: ISignedUrlParams): Promise<string>;

  /**
   * Copy a file within the same bucket/container
   */
  copyFile(sourceKey: string, destinationKey: string): Promise<void>;

  /**
   * Validate configuration and connectivity
   */
  validateConfig(): Promise<boolean>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}
