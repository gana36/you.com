import React, { useState } from 'react';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
  substeps?: ThinkingStep[];
}

interface AgenticThinkingProps {
  steps: ThinkingStep[];
}

const ThinkingStepItem: React.FC<{ step: ThinkingStep; depth?: number }> = ({ step, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubsteps = step.substeps && step.substeps.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-2' : 'mt-0'}`}>
      <div className="flex items-center gap-2.5 text-sm">
        {step.status === 'pending' && (
          <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
        )}
        {step.status === 'active' && (
          <Loader2 className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
        )}
        {step.status === 'complete' && (
          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
        )}
        
        <span className={`${
          step.status === 'active' 
            ? 'text-gray-700' 
            : step.status === 'complete'
            ? 'text-gray-500'
            : 'text-gray-400'
        }`}>
          {step.label}
        </span>

        {hasSubsteps && step.status === 'active' && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-600"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {hasSubsteps && isExpanded && step.status === 'active' && (
        <div className="mt-1">
          {step.substeps!.map((substep) => (
            <ThinkingStepItem key={substep.id} step={substep} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const AgenticThinking: React.FC<AgenticThinkingProps> = ({ steps }) => {
  return (
    <div className="py-3 space-y-2">
      {steps.map((step) => (
        <ThinkingStepItem key={step.id} step={step} />
      ))}
    </div>
  );
};
