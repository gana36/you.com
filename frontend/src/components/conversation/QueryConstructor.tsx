import React from 'react';
import { Code, Sparkles } from 'lucide-react';

interface QueryConstructorProps {
  query: string;
  isConstructing?: boolean;
}

export const QueryConstructor: React.FC<QueryConstructorProps> = ({ query, isConstructing }) => {
  return (
    <div className="my-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400 font-medium">Constructing search query</span>
        {isConstructing && (
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB] animate-pulse" />
        )}
      </div>
      <div className="font-mono text-sm text-green-400 leading-relaxed">
        {query}
      </div>
    </div>
  );
};
