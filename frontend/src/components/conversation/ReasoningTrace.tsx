import React, { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle2, Loader2, Circle } from 'lucide-react';

export interface TraceStep {
  label: string;
  status: 'pending' | 'active' | 'complete';
  details?: string;
  substeps?: TraceStep[];
  timestamp?: string;
}

interface ReasoningTraceProps {
  steps: TraceStep[];
}

const TraceItem: React.FC<{ step: TraceStep; depth?: number }> = ({ step, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubsteps = step.substeps && step.substeps.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-slate-200 pl-4' : ''}`}>
      <div className="flex items-start gap-2 py-2">
        {hasSubsteps && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-0.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasSubsteps && <div className="w-4" />}
        
        <div className="mt-0.5">
          {step.status === 'pending' && <Circle className="w-3.5 h-3.5 text-slate-400" />}
          {step.status === 'active' && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
          {step.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              step.status === 'complete' ? 'text-slate-700' : 'text-slate-900'
            }`}>
              {step.label}
            </span>
            {step.timestamp && (
              <span className="text-xs text-slate-400">{step.timestamp}</span>
            )}
          </div>
          {step.details && (
            <p className="text-sm text-slate-600 mt-1">{step.details}</p>
          )}
        </div>
      </div>

      {hasSubsteps && isExpanded && (
        <div className="mt-1">
          {step.substeps!.map((substep, index) => (
            <TraceItem key={index} step={substep} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ReasoningTrace: React.FC<ReasoningTraceProps> = ({ steps }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">View reasoning process</span>
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          {steps.map((step, index) => (
            <TraceItem key={index} step={step} />
          ))}
        </div>
      )}
    </div>
  );
};
