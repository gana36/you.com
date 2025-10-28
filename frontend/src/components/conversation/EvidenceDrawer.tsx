import React from 'react';
import { X, Check, Globe } from 'lucide-react';

interface EvidenceStep {
  id: string;
  title: string;
  description: string;
  source: {
    name: string;
    timestamp: string;
  };
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  steps: EvidenceStep[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ isOpen, onClose, steps }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-drawer bg-white shadow-xl z-50 flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">Evidence & Reasoning</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable step list */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={step.id} className="relative">
                {/* Timeline connector */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" />
                )}
                
                <div className="flex gap-3">
                  {/* Checkmark circle */}
                  <div className="w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0 relative z-10">
                    <Check className="w-4 h-4 text-white" />
                  </div>

                  <div className="flex-1 pb-2">
                    {/* Step title */}
                    <div className="font-medium text-gray-900 mb-1">{step.title}</div>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3">{step.description}</p>

                    {/* Source box */}
                    <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{step.source.name}</div>
                        <div className="text-xs text-gray-500">{step.source.timestamp}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            All information is sourced from verified health insurance providers and official government websites. 
            Always verify details directly with your insurance provider.
          </p>
        </div>
      </div>
    </>
  );
};
