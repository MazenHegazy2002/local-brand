import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Cloudinary upload handler
// Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['SELLER', 'ADMIN'].includes((session.user as any).role)) {
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
      return NextResponse.json({ message: 'Invalid file type. Only JPEG, PNG, WebP, GIF allowed.' }, { status: 400 });
    }

    // 10MB size limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'File too large. Maximum 10MB allowed.' }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      // Live mode: upload to Cloudinary
      const cloudinary = (await import('cloudinary')).v2;
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'localbrand/products',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        ).end(buffer);
      });

      return NextResponse.json({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      }, { status: 200 });
    }

    // Dev mode: return a mock URL so seller hub doesn't break without cloud keys
    return NextResponse.json({
      url: `https://picsum.photos/seed/${Date.now()}/800/800`,
      publicId: `mock-${Date.now()}`,
      mockMode: true,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ message: error.message || 'Upload failed' }, { status: 500 });
  }
}
