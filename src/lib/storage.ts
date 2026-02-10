/**
 * Storage abstraction for file uploads.
 * Uses Cloudflare R2 when configured, falls back to local filesystem.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ── Types ───────────────────────────────────────────────────

export interface UploadResult {
  /** Public URL to access the file */
  url: string;
  /** Storage key (R2 object key or local filename) */
  key: string;
}

interface StorageProvider {
  upload(buffer: Buffer, filename: string, contentType: string): Promise<UploadResult>;
  delete(urlOrKey: string): Promise<void>;
}

// ── R2 Provider ─────────────────────────────────────────────

function createR2Provider(): StorageProvider {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const bucketName = process.env.R2_BUCKET_NAME!;
  const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, '');

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return {
    async upload(buffer, filename, contentType) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const key = `${year}/${month}/${filename}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const url = `${publicUrl}/${key}`;
      return { url, key };
    },

    async delete(urlOrKey) {
      let key = urlOrKey;
      if (urlOrKey.startsWith('http')) {
        key = urlOrKey.replace(`${publicUrl}/`, '');
      }

      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );
    },
  };
}

// ── Local Provider ──────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function createLocalProvider(): StorageProvider {
  return {
    async upload(buffer, filename, _contentType) {
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }
      const filepath = path.join(UPLOAD_DIR, filename);
      await writeFile(filepath, buffer);
      const url = `/uploads/${filename}`;
      return { url, key: filename };
    },

    async delete(urlOrKey) {
      const filename = urlOrKey.startsWith('/uploads/')
        ? urlOrKey.replace('/uploads/', '')
        : urlOrKey;
      const filepath = path.join(UPLOAD_DIR, filename);
      try {
        await unlink(filepath);
      } catch {
        // File might not exist, that's ok
      }
    },
  };
}

// ── Detect & Export ─────────────────────────────────────────

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

/** Singleton storage provider for the lifetime of the process */
let _storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!_storage) {
    _storage = isR2Configured() ? createR2Provider() : createLocalProvider();
  }
  return _storage;
}

/**
 * Delete a file by its URL, auto-detecting whether it's local or R2.
 * Handles the mixed-state period where old files are local and new files are on R2.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  if (url.startsWith('/uploads/')) {
    await createLocalProvider().delete(url);
  } else if (url.startsWith('http') && isR2Configured()) {
    await createR2Provider().delete(url);
  }
}
