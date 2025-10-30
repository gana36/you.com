import React, { useRef, useEffect } from 'react';
import { Header } from './Header';

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
    <>
      {/* Header */}
      <Header />

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8 bg-background"
      >
        <div className="max-w-5xl mx-auto space-y-1">
          {children}
        </div>
      </div>
    </>
  );
};
