import React, { useState } from 'react';

interface ConversationMessageProps {
  type: 'user' | 'agent';
  content: React.ReactNode;
  timestamp?: string;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({
  type,
  content,
  timestamp
}) => {
  const [showTimestamp, setShowTimestamp] = useState(false);

  if (type === 'user') {
    return (
      <div className="flex justify-end mb-8">
        <div 
          className="relative max-w-[75%]"
          onMouseEnter={() => setShowTimestamp(true)}
          onMouseLeave={() => setShowTimestamp(false)}
        >
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 shadow-sm">
            <div className="text-gray-900 leading-relaxed">
              {content}
            </div>
          </div>
          {showTimestamp && timestamp && (
            <div className="text-xs text-gray-400 mt-2 text-right">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-8">
      <div 
        className="relative max-w-[85%]"
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        <div className="rounded-2xl px-1 py-1">
          <div className="text-gray-800 leading-relaxed">
            {content}
          </div>
        </div>
        {showTimestamp && timestamp && (
          <div className="text-xs text-gray-400 mt-2">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};
