import React from 'react';
import { Product, PRODUCTS } from './storeData';
import { SparklesIcon } from '../Icons';

interface StoreHomeProps {
  onProductSelect: (product: Product) => void;
}

const StoreHome: React.FC<StoreHomeProps> = ({ onProductSelect }) => {
  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center bg-brand-bg overflow-hidden mb-20">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg via-transparent to-brand-bg z-10" />
          {/* Abstract Background */}
          <div className="w-full h-full bg-[url('https://placehold.co/1920x1080/2c0505/ffffff?text=DONNER')] bg-cover bg-center opacity-30" />
        </div>

        <div className="relative z-20 text-center space-y-6 max-w-4xl mx-auto px-6">
          <span className="text-xs font-bold tracking-[0.3em] text-brand-accent/80 uppercase">
            Season 2026 // Digital Collection
          </span>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-brand-cream leading-[0.9]">
            FUTURE
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">
              WEAR
            </span>
          </h2>
          <p className="text-lg text-brand-cream/60 max-w-xl mx-auto font-light">
            Defined by clean lines, premium materials, and versatile silhouettes. Experience the
            world's first AI-powered fitting room.
          </p>
          <button
            onClick={() =>
              document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="px-8 py-4 bg-brand-accent text-brand-bg text-xs font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform hover:bg-brand-cream hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
          >
            View Collection
          </button>
        </div>
      </section>

      {/* Product Grid */}
      <section id="collection" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-end justify-between mb-12 border-b border-brand-cream/10 pb-6">
          <h3 className="text-2xl font-bold tracking-tight text-brand-cream">Latest Drop</h3>
          <span className="text-sm text-brand-cream/60">{PRODUCTS.length} ITEMS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">
          {PRODUCTS.map(product => (
            <div
              key={product.id}
              className="group cursor-pointer"
              onClick={() => onProductSelect(product)}
            >
              <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-brand-dark relative mb-4 border border-brand-cream/5">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-full py-3 bg-brand-bg/90 backdrop-blur text-brand-accent text-xs font-bold uppercase tracking-widest rounded shadow-lg hover:bg-brand-accent hover:text-brand-bg transition-colors">
                    Quick View
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-brand-cream/60">{product.category}</p>
                <div className="flex justify-between items-baseline">
                  <h3 className="text-base font-bold text-brand-cream group-hover:text-brand-accent transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm font-medium text-brand-cream">{product.price}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StoreHome;
