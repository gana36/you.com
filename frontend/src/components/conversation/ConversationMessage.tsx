import React from 'react';
import { User, Sparkles } from 'lucide-react';

interface ConversationMessageProps {
  type: 'user' | 'agent';
  content: React.ReactNode;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({
  type,
  content
}) => {
  if (type === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="flex items-start gap-2 max-w-2xl">
          <div className="bg-slate-900 text-white rounded-lg px-3 py-2">
            {content}
          </div>
          <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="flex items-start gap-2 max-w-3xl">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
          {content}
        </div>
      </div>
    </div>
  );
};
