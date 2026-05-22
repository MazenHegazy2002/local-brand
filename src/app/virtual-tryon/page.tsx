'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const LOADING_MESSAGES = [
  'Analyzing the garment…',
  'Fitting it to your body…',
  'Adjusting lighting and shadows…',
  'Making it look realistic…',
  'Almost there…',
];

export default function VirtualTryOnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const productImageUrl = searchParams.get('product_image') ?? '';
  const colorParam = searchParams.get('color') ?? '';
  const productTitle = searchParams.get('title') ?? 'Product';

  // ── State ──────────────────────────────────────────────────────────────
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState(LOADING_MESSAGES[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages while generating
  useEffect(() => {
    if (!isGenerating) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setProgressMsg(LOADING_MESSAGES[i]);
    }, 3000);
    return () => clearInterval(id);
  }, [isGenerating]);

  // Handle user photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUserPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!userPhoto) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setProgressMsg(LOADING_MESSAGES[0]);

    try {
      const res = await fetch('/api/ai/virtual-tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImageUrl,
          userPhotoBase64: userPhoto,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = `try-on-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-3">
        <div className="container mx-auto px-4 text-xs font-semibold text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-[#1e3b8a] transition-colors">
            Home
          </Link>
          <span>/</span>
          {productTitle && (
            <>
              <button
                onClick={() => router.back()}
                className="hover:text-[#1e3b8a] transition-colors max-w-[160px] truncate"
              >
                {productTitle}
              </button>
              <span>/</span>
            </>
          )}
          <span className="text-[#1e3b8a]">Virtual Try-On</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2">✨ Virtual Try-On</h1>
          <p className="text-slate-500 text-sm max-w-xl">
            Upload a clear photo of yourself and our AI will show you exactly how this item looks on
            you — no changing rooms needed.
            {colorParam && (
              <span className="font-semibold text-slate-700"> Color: {colorParam}.</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Column 1: Product image ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Garment</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square flex items-center justify-center">
              {productImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={productImageUrl} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No product image</span>
              )}
            </div>
          </div>

          {/* ── Column 2: Your photo ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
              Your Photo
            </h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`bg-white rounded-2xl border-2 border-dashed shadow-sm overflow-hidden aspect-square flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#1e3b8a] ${
                userPhoto ? 'border-[#1e3b8a]' : 'border-gray-200'
              }`}
            >
              {userPhoto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={userPhoto} alt="Your photo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                      className="w-7 h-7 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16v-8m-4 4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Click to upload your photo</p>
                  <p className="text-xs text-slate-400">PNG, JPG, HEIC — Max 10 MB</p>
                  <p className="text-xs text-slate-400 max-w-[180px]">
                    Best results: full-body or waist-up, good lighting, plain background
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {userPhoto && (
              <button
                onClick={() => setUserPhoto(null)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* ── Column 3: Result ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Result</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden aspect-square flex flex-col items-center justify-center relative">
              {isGenerating ? (
                <div className="text-center space-y-4 p-6">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-[#1e3b8a] rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">{progressMsg}</p>
                  <p className="text-xs text-slate-400">This takes 15–30 seconds</p>
                </div>
              ) : result ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result} alt="Try-on result" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-2.5 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="px-4 py-2.5 bg-white/20 backdrop-blur text-white text-xs font-black uppercase tracking-widest rounded-xl"
                    >
                      Reset
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-2xl">
                    ✨
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    Your result will appear here
                  </p>
                </div>
              )}
            </div>
            {result && (
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-[#1e3b8a] hover:bg-[#152c6e] text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
              >
                Download HD Image
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-5 py-4">
            {error}
          </div>
        )}

        {/* Generate button */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={!userPhoto || !productImageUrl || isGenerating}
            className={`px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-sm flex items-center gap-3 ${
              !userPhoto || !productImageUrl || isGenerating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#1e3b8a] hover:bg-[#152c6e] text-white shadow-[#1e3b8a]/20 hover:shadow-lg active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <span className="text-base">✨</span>
                Try It On
              </>
            )}
          </button>
          {!userPhoto && (
            <p className="text-xs text-slate-400">Upload your photo above to get started</p>
          )}
        </div>

        {/* Tip */}
        <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 flex gap-4 max-w-2xl mx-auto">
          <span className="text-xl shrink-0">💡</span>
          <div>
            <p className="text-sm font-bold text-blue-900 mb-1">Tips for best results</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Use a well-lit, front-facing photo</li>
              <li>Plain or light-colored background works best</li>
              <li>Waist-up or full-body photos give the most realistic fit</li>
              <li>Avoid heavy filters or extreme crops</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
