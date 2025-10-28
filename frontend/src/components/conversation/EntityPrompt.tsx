import React from 'react';
import { ArrowRight } from 'lucide-react';

interface EntityPromptProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onSkip?: () => void;
  submitLabel?: string;
  skipLabel?: string;
}

export const EntityPrompt: React.FC<EntityPromptProps> = ({
  title,
  description,
  children,
  onSubmit,
  onSkip,
  submitLabel = 'Continue',
  skipLabel = 'Skip'
}) => {
  return (
    <div className="my-4 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600">{description}</p>
        )}
      </div>

      <div className="mb-4">
        {children}
      </div>

      {(onSubmit || onSkip) && (
        <div className="flex gap-3 justify-end">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              {skipLabel}
            </button>
          )}
          {onSubmit && (
            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              {submitLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
