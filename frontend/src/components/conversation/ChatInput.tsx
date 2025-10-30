import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const quickDemoChips = [
  "Explain coinsurance",
  "Show me Florida health insurance news",
  "Tell me about Florida Blue Silver plans",
  "Find doctors in Miami that take Florida Blue",
  "Compare Florida Blue and Molina plans"
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Ask about Florida health insurance, plans, or providers…'
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChipClick = (text: string) => {
    if (!disabled) {
      onSend(text);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-5">
      <div className="max-w-5xl mx-auto">
        {/* Quick demo chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickDemoChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              disabled={disabled}
              className="px-3.5 py-2 text-xs bg-gray-50 text-gray-600 rounded-full border border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-5 py-3.5 pr-12 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none resize-none max-h-32 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
            />
            <button
              disabled
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 cursor-not-allowed"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="w-11 h-11 bg-[#2563EB] text-white rounded-full hover:bg-[#1d4ed8] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-sm"
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
