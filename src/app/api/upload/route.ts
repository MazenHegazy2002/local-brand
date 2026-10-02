import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/mobile-auth';
import { put } from '@vercel/blob';
import { saveFile } from '@/lib/file-store';

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

// Upload handler supporting Vercel Blob and Cloudinary
export async function POST(req: Request) {
  try {
    // Bearer (mobile) or session cookie (web).
    const user = await getRequestUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
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

    // Priority 1: Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
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
      } catch (blobErr) {
        console.warn('Vercel Blob upload failed, attempting fallbacks:', blobErr);
      }
    }

    // Priority 2: Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
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
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to base64 data URL:', cloudErr);
      }
    }

    // Default: store on the server's own disk (Docker volume in production).
    const url = await saveFile(Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ url, publicId: url, mockMode: false }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Upload Error:', err);
    return NextResponse.json({ message: err.message || 'Upload failed' }, { status: 500 });
  }
}
