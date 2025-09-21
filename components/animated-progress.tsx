'use client';

import { useState, useEffect } from 'react';
import { Search, Eye, Star, CheckCircle2 } from 'lucide-react';

interface AnimatedProgressProps {
  steps: string[];
  currentStep: number;
  isActive: boolean;
}

const stepIcons = [
  Search,
  Eye,
  Star,
  CheckCircle2
];

export function AnimatedProgress({ steps, currentStep, isActive }: AnimatedProgressProps) {
  const [animatedCurrentStep, setAnimatedCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep > animatedCurrentStep) {
      const timer = setTimeout(() => {
        setAnimatedCurrentStep(prev => Math.min(prev + 1, currentStep));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentStep, animatedCurrentStep]);

  if (!isActive && steps.length === 0) return null;

  return (
    <div className="backdrop-blur-md bg-white/10 rounded-2xl shadow-xl border border-white/20 p-6">
      <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
        <Search className="h-4 w-4 text-white/80" />
        Search Journey
      </h3>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/20" />

        {/* Animated progress line */}
        <div
          className="absolute left-6 top-6 w-0.5 bg-gradient-to-b from-blue-400 via-purple-500 to-green-400 transition-all duration-1000 ease-out shadow-lg"
          style={{
            height: `${Math.max(0, (animatedCurrentStep / Math.max(1, steps.length - 1)) * 100)}%`
          }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = stepIcons[index] || Search;
            const isCompleted = index < animatedCurrentStep || (!isActive && index === steps.length - 1 && animatedCurrentStep >= steps.length - 1);
            const isCurrent = index === animatedCurrentStep && isActive && index < steps.length - 1;
            const isFinalComplete = !isActive && index === steps.length - 1 && animatedCurrentStep >= steps.length - 1;
            const isUpcoming = index > animatedCurrentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isCurrent ? 'transform scale-105' : ''
                }`}
              >
                {/* Step circle */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted || isFinalComplete
                      ? 'bg-gradient-to-r from-green-400 to-blue-500 shadow-lg shadow-green-400/50'
                      : isCurrent
                      ? 'bg-gradient-to-r from-blue-400 to-purple-500 shadow-lg shadow-blue-400/50 animate-pulse'
                      : 'bg-white/20 border border-white/30'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-all duration-300 ${
                      isCompleted || isCurrent || isFinalComplete ? 'text-white' : 'text-white/50'
                    }`}
                  />
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-ping opacity-30" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1">
                  <div className={`text-sm font-medium transition-all duration-300 ${
                    isCompleted || isFinalComplete ? 'text-green-300' : isCurrent ? 'text-white' : 'text-white/50'
                  }`}>
                    {step}
                  </div>
                  {(isCompleted || isFinalComplete) && (
                    <div className="text-xs text-green-400 mt-1">
                      ✓ Complete
                    </div>
                  )}
                  {isCurrent && isActive && (
                    <div className="text-xs text-blue-300 mt-1">
                      <div className="flex items-center gap-1">
                        <span>In progress</span>
                        <div className="flex space-x-0.5">
                          <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                          <div className="w-1 h-1 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall progress bar at bottom */}
      {(isActive || animatedCurrentStep > 0) && (
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/70">Overall Progress</span>
            <span className="text-xs text-white/70">
              {!isActive && animatedCurrentStep >= steps.length ? '100' : Math.round((animatedCurrentStep / Math.max(1, steps.length)) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${!isActive && animatedCurrentStep >= steps.length ? 100 : (animatedCurrentStep / Math.max(1, steps.length)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}