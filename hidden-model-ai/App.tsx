import React, { useState, useEffect } from 'react';
import {
  ClothingCategory,
  PoseType,
  ArtisticStyle,
  GenerationConfig,
  AppState,
  GenerationType,
} from './types';
import { CATEGORIES, POSES, STYLES, BG_COLORS, LOADING_MESSAGES } from './constants';
import { generateHiddenModelImage, virtualTryOn } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import { DonnerLogo } from './components/ui/DonnerLogo';
import {
  ShoppingBagIcon,
  SparklesIcon,
  XIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CheckIcon,
  UploadIcon,
} from 'lucide-react';
import Store from './components/Store';

const App: React.FC = () => {
  // 1. Initialize State Logic
  // Check URL on mount/update to toggle store vs editor
  const [showStore, setShowStore] = useState(
    () => !new URLSearchParams(window.location.search).get('product_image')
  );

  const [config, setConfig] = useState<GenerationConfig>({
    type: GenerationType.IMAGE,
    category: ClothingCategory.MENS,
    pose: PoseType.PROFESSIONAL,
    bgColor: '#F3F4F6',
    style: ArtisticStyle.CINEMATIC,
    image: null,
    designPrompt: '',
    colorName: 'Pure White',
  });

  const [state, setState] = useState<AppState>({
    isGenerating: false,
    resultImage: null,
    error: null,
    progressMessage: LOADING_MESSAGES[0],
    userPhoto: null,
    isTryOnMode: false,
  });

  // Load product image and color if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productImage = params.get('product_image');
    const colorParam = params.get('color');

    if (productImage) {
      console.log('Found product image in URL:', productImage);
      setShowStore(false); // Ensure we are not showing store

      if (colorParam) {
        setConfig(prev => ({ ...prev, colorName: colorParam }));
      }

      // Fetch/Display the image
      const fetchImage = async () => {
        try {
          // For relative paths (like /products/...), fetch works directly
          const response = await fetch(productImage);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setConfig(prev => ({ ...prev, image: base64data }));
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Failed to load product image from URL:', error);
          setState(prev => ({ ...prev, error: 'Failed to load product image from store.' }));
        }
      };

      fetchImage();
    }
  }, []); // Run once on mount

  useEffect(() => {
    let interval: any;
    if (state.isGenerating) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setState(prev => ({ ...prev, progressMessage: LOADING_MESSAGES[i] }));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [state.isGenerating]);

  const handleGenerate = async () => {
    if (!config.image && !config.designPrompt) {
      setState(prev => ({ ...prev, error: 'Please upload an image or describe your design.' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      resultImage: null,
      isTryOnMode: false,
    }));

    try {
      console.log('Generation started, type:', config.type);
      const result = await generateHiddenModelImage(config);
      setState(prev => ({ ...prev, resultImage: result, isGenerating: false }));
    } catch (err: any) {
      console.error('Generation error:', err);
      if (err.message?.includes('Requested entity was not found')) {
        setState(prev => ({
          ...prev,
          error: 'API Key error. Please check your .env.local file.',
          isGenerating: false,
        }));
      } else if (err.message?.includes('429') || err.message?.includes('Quota exceeded')) {
        setState(prev => ({
          ...prev,
          error: 'Quota exceeded. Please try again in a minute or check your plan.',
          isGenerating: false,
        }));
      } else {
        setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
      }
    }
  };

  const handleTryOn = async () => {
    if (!state.userPhoto || !state.resultImage) return;
    setState(prev => ({
      ...prev,
      isGenerating: true,
      progressMessage: 'Fitting the design to your body...',
    }));
    try {
      const result = await virtualTryOn(state.resultImage, state.userPhoto);
      setState(prev => ({ ...prev, resultImage: result, isGenerating: false, isTryOnMode: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const handleDownload = () => {
    if (state.resultImage) {
      const link = document.createElement('a');
      link.href = state.resultImage;
      link.download = `wear-it-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Conditional Render in JSX
  if (showStore) {
    return <Store />;
  }

  // Editor Render
  return (
    <div className="min-h-screen pb-20 px-4 md:px-6 bg-brand-bg text-brand-cream select-none">
      <nav className="flex items-center justify-between py-6 max-w-6xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-4">
          <DonnerLogo className="h-32 w-auto text-brand-accent transform scale-125 origin-left" />
        </div>
        <div className="flex gap-4"></div>
      </nav>

      <main className="max-w-6xl mx-auto mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-8 space-y-6 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">1. Design & Modify</h2>
              <div className="hidden"></div>
            </div>

            <ImageUploader
              onImageSelect={base64 => setConfig(prev => ({ ...prev, image: base64 }))}
              selectedImage={config.image}
            />

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                    Category
                  </label>
                  <select
                    value={config.category}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, category: e.target.value as ClothingCategory }))
                    }
                    className="w-full bg-brand-dark/50 border border-brand-cream/20 rounded-xl px-4 py-3 text-sm text-brand-cream outline-none focus:ring-2 focus:ring-brand-accent/50"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-black text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                    Base Color Name
                  </label>
                  <input
                    type="text"
                    value={config.colorName}
                    onChange={e => setConfig(prev => ({ ...prev, colorName: e.target.value }))}
                    className="w-full bg-brand-dark/50 border border-brand-cream/20 rounded-xl px-4 py-3 text-sm text-brand-cream outline-none focus:ring-2 focus:ring-brand-accent/50"
                    placeholder="e.g. Midnight Black"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Modify Design Prompt
                </label>
                <textarea
                  placeholder="e.g. Add a subtle gold logo on the chest, or change the fabric to velvet..."
                  className="w-full bg-brand-dark/50 border border-brand-cream/10 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-accent/50 min-h-[100px] text-sm leading-relaxed text-brand-cream placeholder-brand-cream/30"
                  value={config.designPrompt}
                  onChange={e => setConfig(prev => ({ ...prev, designPrompt: e.target.value }))}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setConfig(prev => ({ ...prev, bgColor: color.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${config.bgColor === color.value ? 'border-pink-500 scale-110' : 'border-white/10'}`}
                    style={{ backgroundColor: color.value }}
                  >
                    {config.bgColor === color.value && (
                      <div className={color.value === '#FFFFFF' ? 'text-black' : 'text-white'}>
                        <CheckIcon />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={state.isGenerating}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${state.isGenerating ? 'bg-brand-dark text-brand-cream/50' : 'bg-brand-accent text-brand-bg hover:bg-brand-cream hover:shadow-2xl hover:shadow-brand-accent/20 active:scale-95'}`}
            >
              {state.isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <SparklesIcon />
              )}
              {state.isGenerating ? 'Generating...' : 'Transform & Build'}
            </button>
          </div>

          {(state.resultImage || state.isTryOnMode) && (
            <div className="glass-panel rounded-[2rem] p-8 space-y-6 border border-white/10 animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">2. Wear It Yourself</h2>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-full">
                  AI Fitting Room
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                Upload a clear photo of yourself to see the design on your body.
              </p>

              <ImageUploader
                onImageSelect={base64 => setState(prev => ({ ...prev, userPhoto: base64 }))}
                selectedImage={state.userPhoto}
              />

              <button
                onClick={handleTryOn}
                disabled={state.isGenerating || !state.userPhoto}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${state.isGenerating || !state.userPhoto ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200 active:scale-95'}`}
              >
                {state.isGenerating ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <SparklesIcon />
                )}
                Virtual Try-On
              </button>
            </div>
          )}
        </section>

        <section className="sticky top-10">
          <div className="glass-panel rounded-[3rem] overflow-hidden aspect-[4/5] flex flex-col items-center justify-center p-4 relative group border border-white/10 shadow-2xl">
            {state.isGenerating ? (
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-brand-cream/5 border-t-brand-accent animate-spin mx-auto" />
                  <div className="absolute inset-0 flex items-center justify-center text-brand-accent">
                    <SparklesIcon />
                  </div>
                </div>
                <p className="text-lg font-bold tracking-tight px-10">{state.progressMessage}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Processing Modalities...
                </p>
              </div>
            ) : state.resultImage ? (
              <div className="w-full h-full flex flex-col animate-in zoom-in duration-700 relative">
                <img
                  src={state.resultImage}
                  alt="Design Result"
                  className="w-full h-full object-contain"
                />

                {state.resultImage.includes('placehold.co') && (
                  <div className="absolute top-4 right-4 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 text-yellow-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                    Demo Mode (Quota Exceeded)
                  </div>
                )}

                <div className="absolute bottom-10 inset-x-10 flex gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl"
                  >
                    Download HD Shot
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, resultImage: null }))}
                    className="px-6 py-4 glass-panel text-[10px] font-black uppercase tracking-widest rounded-2xl"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 max-w-xs p-12 bg-white/[0.02] rounded-[3rem] border border-white/5">
                <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto text-brand-accent">
                  <UploadIcon />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Studio Stage</h3>
                  <p className="text-gray-500 text-xs leading-relaxed font-medium">
                    Your design evolution and virtual try-on results will appear in this frame.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                Live Gemini Rendering Engine
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent/50">
              v2.5 Hybrid Mode
            </span>
          </div>
        </section>
      </main>

      <footer className="mt-32 text-center text-gray-800 text-[9px] uppercase tracking-[0.5em] font-black py-10 border-t border-white/5">
        Hidden Model AI // Virtual Fashion Lab // 2024
      </footer>

      <style>{`
        @keyframes bounce-x {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-4px); }
        }
        @keyframes bounce-x-reverse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-x { animation: bounce-x 1s infinite; }
        .animate-bounce-x-reverse { animation: bounce-x-reverse 1s infinite; }
      `}</style>
    </div>
  );
};

export default App;
