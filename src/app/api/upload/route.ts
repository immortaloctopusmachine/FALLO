import { NextRequest } from 'next/server';
import path from 'path';
import { requireAuth, apiSuccess, ApiErrors } from '@/lib/api-utils';
import { getStorage } from '@/lib/storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 50);
  return `${timestamp}-${random}-${baseName}${ext}`;
}

// POST /api/upload
export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'image' or 'attachment'

    if (!file) {
      return ApiErrors.validation('No file provided');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return ApiErrors.validation('File size exceeds 10MB limit');
    }

    // Check file type
    const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      return ApiErrors.validation('File type not allowed');
    }

    // Generate unique filename and upload
    const filename = generateUniqueFilename(file.name);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const storage = getStorage();
    const { url } = await storage.upload(buffer, filename, file.type);

    return apiSuccess({
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Failed to upload file:', error);
    return ApiErrors.internal('Failed to upload file');
  }
}
