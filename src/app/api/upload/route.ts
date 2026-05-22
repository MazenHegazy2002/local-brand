import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionUser } from '@/types';
import { put } from '@vercel/blob';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

// Upload handler supporting Vercel Blob and Cloudinary
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      !['SELLER', 'ADMIN'].includes((session.user as SessionUser).role)
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type server-side (anti-exploit)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' },
        { status: 400 }
      );
    }

    // 10MB hard limit for all environments
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File too large. Maximum 10MB allowed.' },
        { status: 400 }
      );
    }

    // In dev without a cloud storage provider, images are stored as base64
    // data URLs directly in the database — enforce a 2 MB cap to prevent DB
    // bloat from large dev uploads.
    const isDevFallback =
      process.env.NODE_ENV !== 'production' &&
      !process.env.BLOB_READ_WRITE_TOKEN &&
      !process.env.CLOUDINARY_CLOUD_NAME;

    if (isDevFallback && file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        {
          message:
            'Dev mode: image must be ≤ 2 MB when no cloud storage is configured ' +
            '(configure BLOB_READ_WRITE_TOKEN or Cloudinary to lift this limit).',
        },
        { status: 400 }
      );
    }

    // Priority 1: Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`brandy/products/${Date.now()}-${file.name}`, file, {
        access: 'public',
      });
      return NextResponse.json(
        {
          url: blob.url,
          publicId: blob.pathname,
          mockMode: false,
        },
        { status: 200 }
      );
    }

    // Priority 2: Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      const cloudinary = (await import('cloudinary')).v2;
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'brandy/products',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' },
              ],
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result as CloudinaryUploadResult);
            }
          )
          .end(buffer);
      });

      return NextResponse.json(
        {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        },
        { status: 200 }
      );
    }

    // Dev / unconfigured mode: return the file itself as a base64 data URL
    // so the user actually sees what they uploaded (instead of a random
    // picsum image they can't relate to). This is fine for local dev and
    // small previews; production should always have BLOB_READ_WRITE_TOKEN
    // or Cloudinary credentials configured.
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    return NextResponse.json(
      {
        url: dataUrl,
        publicId: `mock-${Date.now()}`,
        mockMode: true,
        message:
          'Stored as a data URL — configure BLOB_READ_WRITE_TOKEN or Cloudinary env vars in production for proper hosted images.',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Upload Error:', err);
    return NextResponse.json({ message: err.message || 'Upload failed' }, { status: 500 });
  }
}
