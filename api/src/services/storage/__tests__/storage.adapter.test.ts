/**
 * Storage Adapter Tests
 *
 * Comprehensive tests for all storage adapter implementations.
 * Tests cover: upload, download, delete, exists, metadata, list, signed URLs, copy
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { LocalStorageAdapter } from '../local.storage.adapter';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

// Test data
const TEST_CONTENT = 'Hello, World!';
const TEST_BUFFER = Buffer.from(TEST_CONTENT);
const TEST_KEY = 'test/file.txt';
const TEST_METADATA = { author: 'test', version: '1.0' };

describe('Storage Adapters', () => {
  describe('LocalStorageAdapter', () => {
    let adapter: LocalStorageAdapter;
    const testDir = path.join(process.cwd(), 'test-storage');

    beforeEach(async () => {
      adapter = new LocalStorageAdapter({
        basePath: testDir,
        publicUrl: 'http://localhost/files',
      });
      await adapter.validateConfig();
    });

    afterEach(async () => {
      await adapter.cleanup();
      // Clean up test directory
      try {
        await fs.rm(testDir, { recursive: true, force: true });
      } catch {
        // Ignore errors
      }
    });

    describe('uploadFile', () => {
      it('should upload a file from Buffer', async () => {
        const result = await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          contentType: 'text/plain',
        });

        expect(result.key).toBe(TEST_KEY);
        expect(result.size).toBe(TEST_BUFFER.length);
        expect(result.etag).toBeTruthy();
        expect(result.url).toContain(TEST_KEY);
        expect(result.timestamp).toBeDefined();
        expect(result.timestamp.getTime()).toBeGreaterThan(0);
      });

      it('should upload a file from string', async () => {
        const result = await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_CONTENT,
          contentType: 'text/plain',
        });

        expect(result.size).toBe(TEST_CONTENT.length);
      });

      it('should store metadata', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          contentType: 'text/plain',
          metadata: TEST_METADATA,
        });

        const metadata = await adapter.getMetadata(TEST_KEY);
        expect(metadata.metadata).toEqual(TEST_METADATA);
        expect(metadata.contentType).toBe('text/plain');
      });

      it('should handle nested paths', async () => {
        const nestedKey = 'deeply/nested/path/file.txt';
        const result = await adapter.uploadFile({
          key: nestedKey,
          data: TEST_BUFFER,
        });

        expect(result.key).toBe(nestedKey);
        const exists = await adapter.fileExists(nestedKey);
        expect(exists).toBe(true);
      });

      it('should overwrite existing file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: 'First version',
        });

        await adapter.uploadFile({
          key: TEST_KEY,
          data: 'Second version',
        });

        const downloaded = await adapter.downloadFile({ key: TEST_KEY });
        expect(downloaded.toString()).toBe('Second version');
      });
    });

    describe('downloadFile', () => {
      it('should download an uploaded file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
        });

        const downloaded = await adapter.downloadFile({ key: TEST_KEY });
        expect(downloaded).toEqual(TEST_BUFFER);
        expect(downloaded.toString()).toBe(TEST_CONTENT);
      });

      it('should throw NotFoundError for non-existent file', async () => {
        await expect(adapter.downloadFile({ key: 'non-existent.txt' })).rejects.toThrow(
          'File not found'
        );
      });
    });

    describe('deleteFile', () => {
      it('should delete an existing file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
        });

        await adapter.deleteFile(TEST_KEY);

        const exists = await adapter.fileExists(TEST_KEY);
        expect(exists).toBe(false);
      });

      it('should delete metadata file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          metadata: TEST_METADATA,
        });

        await adapter.deleteFile(TEST_KEY);

        await expect(adapter.getMetadata(TEST_KEY)).rejects.toThrow();
      });

      it('should throw NotFoundError for non-existent file', async () => {
        await expect(adapter.deleteFile('non-existent.txt')).rejects.toThrow('File not found');
      });
    });

    describe('fileExists', () => {
      it('should return true for existing file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
        });

        const exists = await adapter.fileExists(TEST_KEY);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent file', async () => {
        const exists = await adapter.fileExists('non-existent.txt');
        expect(exists).toBe(false);
      });
    });

    describe('getMetadata', () => {
      it('should retrieve file metadata', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          contentType: 'text/plain',
          metadata: TEST_METADATA,
        });

        const metadata = await adapter.getMetadata(TEST_KEY);

        expect(metadata.key).toBe(TEST_KEY);
        expect(metadata.size).toBe(TEST_BUFFER.length);
        expect(metadata.contentType).toBe('text/plain');
        expect(metadata.etag).toBeTruthy();
        expect(metadata.lastModified).toBeDefined();
        expect(metadata.lastModified.getTime()).toBeGreaterThan(0);
        expect(metadata.metadata).toEqual(TEST_METADATA);
      });

      it('should throw NotFoundError for non-existent file', async () => {
        await expect(adapter.getMetadata('non-existent.txt')).rejects.toThrow('File not found');
      });
    });

    describe('listFiles', () => {
      beforeEach(async () => {
        // Upload multiple test files
        await adapter.uploadFile({ key: 'file1.txt', data: 'content1' });
        await adapter.uploadFile({ key: 'file2.txt', data: 'content2' });
        await adapter.uploadFile({ key: 'dir1/file3.txt', data: 'content3' });
        await adapter.uploadFile({ key: 'dir1/file4.txt', data: 'content4' });
        await adapter.uploadFile({ key: 'dir2/file5.txt', data: 'content5' });
      });

      it('should list all files', async () => {
        const result = await adapter.listFiles();

        expect(result.items.length).toBe(5);
        expect(result.totalCount).toBe(5);
        expect(result.items.every((item) => item.key && item.size > 0)).toBe(true);
      });

      it('should filter by prefix', async () => {
        const result = await adapter.listFiles({ prefix: 'dir1/' });

        expect(result.items.length).toBe(2);
        expect(result.items.every((item) => item.key.startsWith('dir1/'))).toBe(true);
      });

      it('should limit results', async () => {
        const result = await adapter.listFiles({ maxResults: 2 });

        expect(result.items.length).toBe(2);
        expect(result.nextPageToken).toBeTruthy();
      });

      it('should return empty list for non-existent prefix', async () => {
        const result = await adapter.listFiles({ prefix: 'nonexistent/' });

        expect(result.items.length).toBe(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe('getSignedUrl', () => {
      it('should generate a signed URL', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
        });

        const url = await adapter.getSignedUrl({
          key: TEST_KEY,
          expirationSeconds: 3600,
          action: 'read',
        });

        expect(url).toContain(TEST_KEY);
        expect(url).toContain('token=');
        expect(url).toContain('expires=');
      });

      it('should include expiration time', async () => {
        const expirationSeconds = 3600;
        const beforeTime = Date.now();

        const url = await adapter.getSignedUrl({
          key: TEST_KEY,
          expirationSeconds,
        });

        const expiresMatch = url.match(/expires=(\d+)/);
        expect(expiresMatch).toBeTruthy();

        const expiresTime = parseInt(expiresMatch![1]);
        const expectedExpiry = beforeTime + expirationSeconds * 1000;

        // Allow 1 second tolerance
        expect(Math.abs(expiresTime - expectedExpiry)).toBeLessThan(1000);
      });
    });

    describe('copyFile', () => {
      it('should copy a file', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          contentType: 'text/plain',
          metadata: TEST_METADATA,
        });

        const destKey = 'test/copied-file.txt';
        await adapter.copyFile(TEST_KEY, destKey);

        const original = await adapter.downloadFile({ key: TEST_KEY });
        const copied = await adapter.downloadFile({ key: destKey });

        expect(copied).toEqual(original);
      });

      it('should copy metadata', async () => {
        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          contentType: 'text/plain',
          metadata: TEST_METADATA,
        });

        const destKey = 'test/copied-file.txt';
        await adapter.copyFile(TEST_KEY, destKey);

        const metadata = await adapter.getMetadata(destKey);
        expect(metadata.metadata).toEqual(TEST_METADATA);
        expect(metadata.contentType).toBe('text/plain');
      });

      it('should throw NotFoundError for non-existent source', async () => {
        await expect(adapter.copyFile('non-existent.txt', 'dest.txt')).rejects.toThrow(
          'Source file not found'
        );
      });
    });

    describe('validateConfig', () => {
      it('should validate configuration', async () => {
        const isValid = await adapter.validateConfig();
        expect(isValid).toBe(true);
      });

      it('should create base directory if not exists', async () => {
        await fs.rm(testDir, { recursive: true, force: true });

        const isValid = await adapter.validateConfig();
        expect(isValid).toBe(true);

        const stats = await fs.stat(testDir);
        expect(stats.isDirectory()).toBe(true);
      });
    });

    describe('security', () => {
      it('should prevent directory traversal in keys', async () => {
        const maliciousKey = '../../../etc/passwd';

        await adapter.uploadFile({
          key: maliciousKey,
          data: TEST_BUFFER,
        });

        // File should be stored safely within basePath
        const exists = await adapter.fileExists(maliciousKey);
        expect(exists).toBe(true);

        // Verify it's actually in the test directory
        const result = await adapter.listFiles();
        const found = result.items.find((item) => item.key.includes('passwd'));
        expect(found).toBeTruthy();
        expect(found!.key).not.toContain('..');
      });
    });

    describe('edge cases', () => {
      it('should handle empty file', async () => {
        const emptyBuffer = Buffer.from('');
        const result = await adapter.uploadFile({
          key: 'empty.txt',
          data: emptyBuffer,
        });

        expect(result.size).toBe(0);

        const downloaded = await adapter.downloadFile({ key: 'empty.txt' });
        expect(downloaded.length).toBe(0);
      });

      it('should handle large metadata', async () => {
        const largeMetadata: Record<string, string> = {};
        for (let i = 0; i < 50; i++) {
          largeMetadata[`key${i}`] = `value${i}`;
        }

        await adapter.uploadFile({
          key: TEST_KEY,
          data: TEST_BUFFER,
          metadata: largeMetadata,
        });

        const metadata = await adapter.getMetadata(TEST_KEY);
        expect(metadata.metadata).toEqual(largeMetadata);
      });

      it('should handle special characters in keys', async () => {
        const specialKey = 'test/file-with-special!@#$%^&()chars.txt';

        await adapter.uploadFile({
          key: specialKey,
          data: TEST_BUFFER,
        });

        const exists = await adapter.fileExists(specialKey);
        expect(exists).toBe(true);

        const downloaded = await adapter.downloadFile({ key: specialKey });
        expect(downloaded).toEqual(TEST_BUFFER);
      });

      it('should handle binary data', async () => {
        const binaryData = crypto.randomBytes(1024);

        const result = await adapter.uploadFile({
          key: 'binary.dat',
          data: binaryData,
          contentType: 'application/octet-stream',
        });

        expect(result.size).toBe(1024);

        const downloaded = await adapter.downloadFile({ key: 'binary.dat' });
        expect(downloaded).toEqual(binaryData);
      });
    });
  });
});
