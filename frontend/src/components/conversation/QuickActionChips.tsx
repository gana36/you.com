import React from 'react';

interface QuickActionChipsProps {
  actions: string[];
  onActionClick?: (action: string) => void;
}

export const QuickActionChips: React.FC<QuickActionChipsProps> = ({ actions, onActionClick }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={() => onActionClick?.(action)}
          className="px-3 py-1.5 text-xs bg-white text-gray-700 rounded-full border border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
        >
          {action}
        </button>
      ))}
    </div>
  );
};
