'use client';

// Product photos in Admin OS: pick a photo, download it, or edit it in the browser
// (rotate, flip, square crop, brightness / contrast / saturation) and save it back.
// The edit never redraws the product itself, so the item shown stays the real one.
import { useEffect, useRef, useState } from 'react';

interface Img {
  id: string;
  url: string;
  isPrimary?: boolean;
}

const fileName = (title: string, n: number, ext = 'jpg') =>
  `${title.replace(/[^\w؀-ۿ]+/g, '-').replace(/^-|-$/g, '') || 'product'}-${n}.${ext}`;

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Served by our admin API so photos hosted elsewhere can still be downloaded and edited.
const photoUrl = (productId: string, imageId: string) =>
  `/api/admin/products/${productId}/images?imageId=${encodeURIComponent(imageId)}`;

async function loadBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Could not load the photo (${res.status})`);
  return res.blob();
}

export default function ProductPhotoTools({
  productId,
  title,
  images: initial,
}: {
  productId: string;
  title: string;
  images: Img[];
}) {
  const [images, setImages] = useState<Img[]>(initial || []);
  const [sel, setSel] = useState(() =>
    Math.max(
      0,
      (initial || []).findIndex(i => i.isPrimary)
    )
  );
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const current = images[sel];

  const download = async () => {
    if (!current) return;
    setMsg('');
    try {
      const blob = await loadBlob(photoUrl(productId, current.id));
      saveBlob(
        blob,
        fileName(title, sel + 1, (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'))
      );
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div>
      <div className="aspect-square bg-slate-50 border rounded-xl overflow-hidden mb-3 relative flex items-center justify-center">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span className="text-slate-400 text-xs">No image attached</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSel(i)}
              className={`w-12 h-12 rounded border overflow-hidden flex-shrink-0 ${i === sel ? 'ring-2 ring-blue-500' : ''}`}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
      {current && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={download}
            className="flex-1 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            ⬇️ Download
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            ✏️ Edit photo
          </button>
        </div>
      )}
      {msg && <div className="text-xs text-red-600 mt-2">{msg}</div>}
      {editing && current && (
        <PhotoEditor
          image={current}
          productId={productId}
          title={title}
          index={sel}
          onClose={() => setEditing(false)}
          onSaved={url => {
            setImages(imgs => imgs.map((im, i) => (i === sel ? { ...im, url } : im)));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function PhotoEditor({
  image,
  productId,
  title,
  index,
  onClose,
  onSaved,
}: {
  image: Img;
  productId: string;
  title: string;
  index: number;
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flip, setFlip] = useState(false);
  const [square, setSquare] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadBlob(photoUrl(productId, image.id))
      .then(createImageBitmap)
      .then(b => !cancelled && setBitmap(b))
      .catch(e => setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [productId, image.id, image.url]);

  // Draw the photo with the current edits onto the canvas (full resolution).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    const turned = rotation % 180 !== 0;
    const w = turned ? bitmap.height : bitmap.width;
    const h = turned ? bitmap.width : bitmap.height;
    const side = Math.min(w, h);
    canvas.width = square ? side : w;
    canvas.height = square ? side : h;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    ctx.restore();
  }, [bitmap, rotation, flip, square, brightness, contrast, saturation]);

  const toBlob = () =>
    new Promise<Blob>((resolve, reject) =>
      canvasRef.current!.toBlob(
        b => (b ? resolve(b) : reject(new Error('Could not export the photo'))),
        'image/jpeg',
        0.92
      )
    );

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await toBlob();
      const form = new FormData();
      form.append('file', new File([blob], fileName(title, index + 1), { type: 'image/jpeg' }));
      const up = await fetch('/api/upload', { method: 'POST', body: form });
      const upBody = await up.json().catch(() => ({}));
      if (!up.ok || !upBody.url) throw new Error(upBody.error || upBody.message || 'Upload failed');
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: image.id, url: upBody.url }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save the photo');
      onSaved(upBody.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRotation(0);
    setFlip(false);
    setSquare(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const slider = (label: string, value: number, set: (n: number) => void) => (
    <label className="block text-xs text-slate-600">
      <span className="flex justify-between">
        {label}
        <span>{value}%</span>
      </span>
      <input
        type="range"
        min={50}
        max={150}
        value={value}
        onChange={e => set(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 860, width: '95vw', padding: 20 }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-800">Edit photo {index + 1}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_240px] gap-4">
          <div
            className="bg-slate-100 rounded-lg flex items-center justify-center p-2"
            style={{ minHeight: 320 }}
          >
            {error && !bitmap ? (
              <span className="text-xs text-red-600">{error}</span>
            ) : !bitmap ? (
              <span className="text-xs text-slate-400">Loading…</span>
            ) : null}
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: 460, display: bitmap ? 'block' : 'none' }}
            />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                type="button"
                className="border rounded py-2"
                onClick={() => setRotation(r => (r + 270) % 360)}
              >
                ⟲ Rotate left
              </button>
              <button
                type="button"
                className="border rounded py-2"
                onClick={() => setRotation(r => (r + 90) % 360)}
              >
                ⟳ Rotate right
              </button>
              <button
                type="button"
                className={`border rounded py-2 ${flip ? 'bg-slate-800 text-white' : ''}`}
                onClick={() => setFlip(f => !f)}
              >
                ⇋ Flip
              </button>
              <button
                type="button"
                className={`border rounded py-2 ${square ? 'bg-slate-800 text-white' : ''}`}
                onClick={() => setSquare(s => !s)}
              >
                ▢ Square crop
              </button>
            </div>
            {slider('Brightness', brightness, setBrightness)}
            {slider('Contrast', contrast, setContrast)}
            {slider('Saturation', saturation, setSaturation)}
            <button type="button" onClick={reset} className="text-xs text-slate-500 underline">
              Reset changes
            </button>
            {error && bitmap && <div className="text-xs text-red-600">{error}</div>}
            <button
              type="button"
              disabled={!bitmap || busy}
              onClick={save}
              className="btn-primary w-full disabled:opacity-50"
              style={{ padding: '10px', fontSize: 13 }}
            >
              {busy ? 'Saving…' : '💾 Save to product'}
            </button>
            <button
              type="button"
              disabled={!bitmap}
              onClick={async () => saveBlob(await toBlob(), fileName(title, index + 1))}
              className="w-full border border-slate-300 rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
            >
              ⬇️ Download edited
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
