import React from 'react';
import { FileText, Scale, Search, Users, DollarSign, Calendar, Brain, Pill } from 'lucide-react';

interface IntentBadgeProps {
  intent: string;
  confidence: number;
}

const intentConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'PlanInfo': { label: 'Plan Details', icon: FileText, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Comparison': { label: 'Plan Comparison', icon: Scale, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'ProviderNetwork': { label: 'Provider Search', icon: Search, color: 'bg-green-100 text-green-700 border-green-200' },
  'CoverageDetail': { label: 'Coverage Details', icon: Pill, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'FAQ': { label: 'General Question', icon: Brain, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'News': { label: 'News & Updates', icon: Calendar, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

export const IntentBadge: React.FC<IntentBadgeProps> = ({ intent, confidence }) => {
  const config = intentConfig[intent] || intentConfig['FAQ'];
  const Icon = config.icon;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium animate-in fade-in duration-300" style={{ animationDelay: '100ms' }}>
      <div className={`flex items-center gap-1.5 ${config.color} px-2 py-0.5 rounded-full`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.label}</span>
      </div>
      <span className="text-slate-600">{Math.round(confidence * 100)}%</span>
    </div>
  );
};
