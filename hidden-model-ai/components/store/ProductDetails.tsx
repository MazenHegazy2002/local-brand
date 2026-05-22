import React, { useState } from 'react';
import { Product } from './storeData';
import { SparklesIcon } from '../Icons';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onAddToCart: () => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onBack, onAddToCart }) => {
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);

  // Handler for color selection
  const handleColorSelect = (color: (typeof product.colors)[0]) => {
    setSelectedColor(color);
    // Switch the main image to the one associated with this color
    if (product.images[color.imageIndex]) {
      setSelectedImage(product.images[color.imageIndex]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="mb-8 text-sm font-medium text-brand-cream/60 hover:text-brand-accent flex items-center gap-2 transition-colors"
      >
        ← Back to Collection
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        {/* Gallery Section */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-brand-dark/50 border border-brand-cream/5">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover object-center animate-in fade-in duration-300 key={selectedImage}"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`aspect-[3/4] rounded-lg overflow-hidden bg-brand-dark border-2 transition-all ${selectedImage === img ? 'border-brand-accent opacity-100' : 'border-transparent opacity-70 hover:opacity-100 hover:border-brand-cream/30'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="mb-2">
            <span className="text-xs font-bold tracking-widest text-brand-accent uppercase">
              {product.category}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-brand-cream tracking-tight mb-4">
            {product.name}
          </h1>
          <p className="text-2xl font-medium text-brand-cream/90 mb-8">{product.price}</p>

          <div className="prose prose-sm text-brand-cream/70 mb-10">
            <p>{product.description}</p>
          </div>

          {/* Selectors */}
          {/* Selectors */}
          <div className="space-y-6 mb-10">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-brand-cream mb-3 block">
                Color: {selectedColor.name}
              </label>
              <div className="flex gap-3">
                {product.colors.map(color => (
                  <button
                    key={color.name}
                    onClick={() => handleColorSelect(color)}
                    className={`w-10 h-10 rounded-full border-2 p-0.5 transition-all ${selectedColor.name === color.name ? 'border-brand-accent scale-110' : 'border-brand-cream/20 hover:border-brand-cream/50'}`}
                    title={color.name}
                  >
                    <div
                      className={`w-full h-full rounded-full ${color.class} border border-white/10 shadow-sm`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-widest text-brand-cream mb-3 block">
                Size: {selectedSize}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-lg border flex items-center justify-center text-sm font-bold transition-all ${selectedSize === size ? 'bg-brand-accent text-brand-bg border-brand-accent' : 'bg-brand-dark/50 text-brand-cream border-brand-cream/10 hover:border-brand-cream/40'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mb-12">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onAddToCart}
                className="py-4 bg-brand-cream text-brand-bg text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white transition-colors active:scale-95 duration-200"
              >
                Add to Bag
              </button>
              <a
                href={`/?product_image=${encodeURIComponent(selectedImage)}`}
                className="py-4 bg-brand-primary text-brand-cream text-xs font-bold uppercase tracking-widest rounded-xl hover:shadow-xl hover:shadow-brand-primary/20 hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2 active:scale-95 duration-200"
              >
                <SparklesIcon />
                Virtual Try-On
              </a>
            </div>
            <p className="text-[10px] text-center text-brand-cream/40">
              *Virtual Try-On uses our proprietary Hidden Model AI to simulate fit.
            </p>
          </div>

          {/* Details Accordion */}
          <div className="border-t border-brand-cream/10 divide-y divide-brand-cream/10">
            <div className="py-4">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-brand-cream">
                Details
              </h4>
              <ul className="list-disc list-inside text-sm text-brand-cream/60 space-y-1">
                {product.details.map(d => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div className="py-4">
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-brand-cream">
                Shipping & Returns
              </h4>
              <p className="text-sm text-brand-cream/60">{product.shipping}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
