import React from 'react';
import { Loader2 } from 'lucide-react';

interface InlineThinkingProps {
  intent: string;
}

export const InlineThinking: React.FC<InlineThinkingProps> = ({ intent }) => {
  const getThinkingText = (intent: string): string => {
    const texts: Record<string, string> = {
      'PlanInfo': 'Analyzing plan requirements...',
      'Comparison': 'Preparing plan comparison...',
      'ProviderNetwork': 'Searching provider networks...',
      'CoverageDetail': 'Checking coverage details...'
    };
    return texts[intent] || 'Processing your request...';
  };

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 py-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
      <span>{getThinkingText(intent)}</span>
    </div>
  );
};
