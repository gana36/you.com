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
    <div className={`${depth > 0 ? 'ml-4 mt-1' : 'mt-1.5'}`}>
      <div className="flex items-center gap-2 text-xs">
        {step.status === 'pending' && (
          <div className="w-1 h-1 bg-slate-300 rounded-full" />
        )}
        {step.status === 'active' && (
          <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
        )}
        {step.status === 'complete' && (
          <CheckCircle2 className="w-3 h-3 text-green-600" />
        )}
        
        <span className={`${
          step.status === 'active' 
            ? 'text-slate-900 font-medium' 
            : step.status === 'complete'
            ? 'text-slate-600'
            : 'text-slate-400'
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
    <div className="py-2 space-y-0.5">
      {steps.map((step) => (
        <ThinkingStepItem key={step.id} step={step} />
      ))}
    </div>
  );
};
