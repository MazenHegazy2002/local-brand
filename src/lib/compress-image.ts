// Client-side image compression. Phone gallery photos are routinely 5-12 MB
// JPEGs which break two things in production:
//   1) Server Actions cap request bodies around 1 MB on Vercel. When the
//      upload endpoint falls back to a base64 data URL (no Vercel Blob /
//      Cloudinary configured) and that URL is then sent through a server
//      action, the request gets rejected and the page surfaces the
//      generic "Server Components render" error.
//   2) Even when uploads succeed, multi-MB strings travelling through the
//      RSC payload bloat the page weight and slow everything down.
// A quick Canvas-based downscale to 1600 px max edge + JPEG ~80% quality
// turns a 5 MB phone photo into roughly 200-400 KB without any visible
// quality loss for product imagery, and uses only the standard browser
// APIs so we don't add a dependency.

export interface CompressOptions {
  maxDimension?: number; // longest edge in pixels
  quality?: number; // 0..1, JPEG quality
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  mimeType: 'image/jpeg',
};

/**
 * Compress an image File. Returns the original file if it's already small
 * or not a raster image we can process (e.g. SVG, GIF). Never throws —
 * a failure to compress just yields the input untouched so the caller can
 * still attempt the upload.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  if (typeof window === 'undefined') return file;
  // GIFs (animation) and SVGs lose their nature when rasterised; pass them
  // through. Anything else we'll try to compress.
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  // Files already comfortably under the server-action limit don't need to
  // be re-encoded — re-encoding small images can actually grow them.
  if (file.size <= 400 * 1024) return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, opts.maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    // Free the bitmap memory — phones can be tight on this.
    if ('close' in bitmap) (bitmap as ImageBitmap).close();

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, opts.mimeType, opts.quality)
    );
    if (!blob) return file;

    const newName = renameForType(file.name, opts.mimeType);
    return new File([blob], newName, { type: opts.mimeType, lastModified: Date.now() });
  } catch (err) {
    console.warn('[compress-image] falling back to original file:', err);
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap is supported in every modern browser and respects
  // EXIF orientation automatically. We fall back to <img> for old WebViews.
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' as ImageOrientation });
  }
  return loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image'));
    };
    img.src = url;
  });
}

function scaleToFit(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = Math.min(maxDim / w, maxDim / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function renameForType(originalName: string, mime: string) {
  const ext = mime === 'image/webp' ? 'webp' : 'jpg';
  const base = originalName.replace(/\.[^/.]+$/, '') || 'image';
  return `${base}.${ext}`;
}
