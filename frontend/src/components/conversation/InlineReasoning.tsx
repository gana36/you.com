import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ReasoningStep {
  id: string;
  label: string;
  description: string;
}

interface InlineReasoningProps {
  steps: ReasoningStep[];
}

export const InlineReasoning: React.FC<InlineReasoningProps> = ({ steps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
      {/* Header - Minimal like ChatGPT */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-100/50 transition-colors text-left group"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <span className="text-sm text-gray-600 font-normal">
          {isExpanded ? 'Reasoning' : 'Reasoning'}
        </span>
        {!isExpanded && (
          <span className="text-xs text-gray-400">({steps.length})</span>
        )}
      </button>

      {/* Expandable content - Clean list */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 space-y-2 bg-white/40">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex gap-3 py-1.5">
              <span className="text-xs text-gray-400 font-medium mt-0.5 flex-shrink-0">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-medium">{step.label}:</span>{' '}
                  <span className="text-gray-600">{step.description}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
