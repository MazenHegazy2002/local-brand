'use client';

import { ReactNode, useState, useCallback } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content?: ReactNode;
  children?: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'underline' | 'pill';
  lazy?: boolean;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, variant = 'underline', lazy = false, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  }, [onChange]);

  const activeTabData = tabs.find((t) => t.id === activeTab);

  const underlineStyles = 'border-b-2 border-transparent data-[active=true]:border-[hsl(var(--primary))] data-[active=true]:text-[hsl(var(--primary))]';
  const pillStyles = 'rounded-full px-4 py-2 data-[active=true]:bg-[hsl(var(--primary))] data-[active=true]:text-white';

  return (
    <div className={className}>
      <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            data-active={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative flex-shrink-0 py-3 px-4 text-sm font-semibold text-gray-500 transition-colors
              hover:text-[hsl(var(--foreground))]
              ${variant === 'underline' ? underlineStyles : pillStyles}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {lazy ? (
          activeTabData && (
            <div key={activeTab} className="animate-in fade-in duration-200">
              {activeTabData.content || activeTabData.children}
            </div>
          )
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              hidden={activeTab !== tab.id}
              className={activeTab === tab.id ? 'animate-in fade-in duration-200' : 'hidden'}
            >
              {tab.content || tab.children}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Tabs;