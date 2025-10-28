import React, { useRef, useEffect } from 'react';

interface ChatLayoutProps {
  children: React.ReactNode;
  autoScroll?: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  autoScroll = true
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children, autoScroll]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-3 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold text-slate-900">Health Insurance Assistant</h1>
        </div>
      </div>

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
