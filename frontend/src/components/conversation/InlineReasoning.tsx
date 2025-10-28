import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

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
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50/50 to-purple-50/50">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#2563EB]" />
          <span className="text-sm font-medium text-gray-700">
            {isExpanded ? 'Hide reasoning' : 'Show reasoning'}
          </span>
          <span className="text-xs text-gray-500">({steps.length} steps)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-gray-200 bg-white/30">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex gap-3 pt-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                <span className="text-xs font-medium text-[#2563EB]">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 mb-0.5">{step.label}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
