'use client';

import { useState } from 'react';

export interface FilterGroup {
  id: string;
  title: string;
  type: 'checkbox' | 'range' | 'radio';
  options?: { label: string; value: string; count?: number }[];
  min?: number;
  max?: number;
  minValue?: number;
  maxValue?: number;
  onRangeChange?: (min: number, max: number) => void;
}

interface FilterSidebarProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, values: string[]) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterSidebar({ groups, activeFilters, onFilterChange, onClearAll, className = '' }: FilterSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(groups.map((g) => g.id)));

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const activeCount = Object.values(activeFilters).flat().length;

  const handleCheckboxChange = (groupId: string, value: string, checked: boolean) => {
    const current = activeFilters[groupId] || [];
    const updated = checked ? [...current, value] : current.filter((v) => v !== value);
    onFilterChange(groupId, updated);
  };

  const handleRangeChange = (groupId: string, type: 'min' | 'max', value: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const numValue = parseFloat(value) || 0;
    if (type === 'min') {
      group.onRangeChange?.(numValue, group.maxValue ?? group.max ?? 0);
    } else {
      group.onRangeChange?.(group.minValue ?? group.min ?? 0, numValue);
    }
  };

  return (
    <div className={`bg-white rounded-[var(--radius)] border border-gray-100 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg text-gray-900">Filters</h3>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="text-sm text-[hsl(var(--primary))] hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const isOpen = openGroups.has(group.id);
          const selected = activeFilters[group.id] || [];

          return (
            <div key={group.id} className="border-b border-gray-100 pb-4 last:border-0">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className="font-semibold text-gray-800">{group.title}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                <div className="mt-3">
                  {group.type === 'checkbox' && group.options && (
                    <div className="space-y-2">
                      {group.options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.includes(opt.value)}
                            onChange={(e) => handleCheckboxChange(group.id, opt.value, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                          />
                          <span className="text-sm text-gray-600 flex-1">{opt.label}</span>
                          {opt.count !== undefined && (
                            <span className="text-xs text-gray-400">({opt.count})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {group.type === 'radio' && group.options && (
                    <div className="space-y-2">
                      {group.options.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={group.id}
                            checked={selected.includes(opt.value)}
                            onChange={() => onFilterChange(group.id, [opt.value])}
                            className="w-4 h-4 border-gray-300 text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring))]"
                          />
                          <span className="text-sm text-gray-600">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {group.type === 'range' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={group.minValue ?? group.min ?? ''}
                          onChange={(e) => handleRangeChange(group.id, 'min', e.target.value)}
                          placeholder="Min"
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={group.maxValue ?? group.max ?? ''}
                          onChange={(e) => handleRangeChange(group.id, 'max', e.target.value)}
                          placeholder="Max"
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      </div>
                      <input
                        type="range"
                        min={group.min ?? 0}
                        max={group.max ?? 1000}
                        value={group.maxValue ?? group.max ?? 0}
                        onChange={(e) => handleRangeChange(group.id, 'max', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FilterSidebar;