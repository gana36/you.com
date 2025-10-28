import React from 'react';
import { Code, Sparkles } from 'lucide-react';

interface QueryConstructorProps {
  query: string;
  isConstructing?: boolean;
}

export const QueryConstructor: React.FC<QueryConstructorProps> = ({ query, isConstructing }) => {
  return (
    <div className="my-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <Code className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Search Query</span>
        {isConstructing && (
          <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
        )}
      </div>
      <div className="font-mono text-xs text-green-400 leading-relaxed">
        {query}
      </div>
    </div>
  );
};
