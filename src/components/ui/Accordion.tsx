'use client';

import { ReactNode, useState } from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultipleOpen?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({ items, allowMultipleOpen = false, defaultOpen = [], className = '' }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultipleOpen) newSet.clear();
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        
        return (
          <div key={item.id} className="border border-[hsl(var(--border))] rounded-[var(--radius)] overflow-hidden">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[hsl(var(--foreground))]">{item.title}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="p-4 border-t border-[hsl(var(--border))] bg-gray-50 text-gray-600">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Accordion;