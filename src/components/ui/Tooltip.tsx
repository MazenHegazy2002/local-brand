'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const positionStyles: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowPositions: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
};

export function Tooltip({ content, children, position = 'top', delay = 300, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative inline-block" onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg whitespace-nowrap
            animate-in fade-in duration-150
            ${positionStyles[position]}
            ${className}
          `}
        >
          {content}
          <span
            className={`
              absolute w-0 h-0 border-4 border-transparent
              ${arrowPositions[position]}
            `}
          />
        </div>
      )}
    </div>
  );
}

export default Tooltip;