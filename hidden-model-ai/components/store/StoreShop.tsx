import React from 'react';
import { Product, PRODUCTS } from './storeData';

interface StoreShopProps {
  onProductSelect: (product: Product) => void;
}

const StoreShop: React.FC<StoreShopProps> = ({ onProductSelect }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">
      <div className="flex items-end justify-between mb-12 border-b border-brand-cream/10 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-brand-cream mb-2">Shop All</h1>
          <p className="text-brand-cream/60 text-sm">
            Explore our complete collection of digital-physical hybrids.
          </p>
        </div>
        <span className="text-sm font-medium text-brand-cream/60">{PRODUCTS.length} PRODUCTS</span>
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
    </div>
  );
};

export default StoreShop;
