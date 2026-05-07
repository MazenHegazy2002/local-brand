'use client';

import { ReactNode } from 'react';

export interface StepperStep {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${isCompleted || isCurrent
                    ? 'bg-[hsl(var(--primary))] text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                  ${isCurrent ? 'ring-4 ring-[hsl(var(--primary))]/20' : ''}
                `}
              >
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-[hsl(var(--primary))]' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[100px]">{step.description}</p>
                )}
              </div>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-[hsl(var(--primary))]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;