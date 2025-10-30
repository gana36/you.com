import React from 'react';
import { CheckCircle2, Loader2, Circle, ArrowRight } from 'lucide-react';

export interface AgentStep {
  name: string;
  status: 'pending' | 'active' | 'complete';
}

interface AgentRoutingProps {
  steps: AgentStep[];
}

export const AgentRouting: React.FC<AgentRoutingProps> = ({ steps }) => {
  return (
    <div className="flex items-center gap-2 mb-4 p-3 bg-white border border-slate-200 rounded-lg">
      {steps.map((step, index) => (
        <React.Fragment key={step.name}>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
              step.status === 'active'
                ? 'bg-blue-50 border border-blue-200 scale-105'
                : step.status === 'complete'
                ? 'bg-green-50 border border-green-200'
                : 'bg-slate-50 border border-slate-200'
            }`}
          >
            {step.status === 'pending' && <Circle className="w-3.5 h-3.5 text-slate-400" />}
            {step.status === 'active' && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
            {step.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
            <span
              className={`text-xs font-medium ${
                step.status === 'active'
                  ? 'text-blue-700'
                  : step.status === 'complete'
                  ? 'text-green-700'
                  : 'text-slate-500'
              }`}
            >
              {step.name}
            </span>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
