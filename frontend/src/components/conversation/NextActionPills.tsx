import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

export interface Action {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface NextActionPillsProps {
  actions: Action[];
  onAction: (id: string) => void;
}

export const NextActionPills: React.FC<NextActionPillsProps> = ({ actions, onAction }) => {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        const isPrimary = action.variant === 'primary';

        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 animate-in fade-in duration-300 ${
              isPrimary
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{action.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};
