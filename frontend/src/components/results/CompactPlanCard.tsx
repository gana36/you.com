import React from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';

interface CompactPlanCardProps {
  plan: Plan;
  isRecommended?: boolean;
}

export const CompactPlanCard: React.FC<CompactPlanCardProps> = ({ plan, isRecommended }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-all hover:border-gray-300">
      {/* Header - simplified */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-gray-900 font-semibold flex-1">{plan.name}</h4>
          <span className="px-2.5 py-1 bg-[#2563EB]/10 text-[#2563EB] text-xs font-medium rounded-full ml-2">
            {plan.type}
          </span>
        </div>
        <p className="text-sm text-gray-500">{plan.carrier}</p>
      </div>

      {/* Best value badge */}
      {isRecommended && (
        <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E]/10 text-[#22C55E] text-xs font-medium rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Best Value
        </div>
      )}

      {/* Key details only */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-500">Deductible</span>
          <span className="font-semibold text-gray-900">${plan.deductible}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-500">Monthly Premium</span>
          <span className="font-semibold text-gray-900">${plan.monthlyPremium}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-500">OOP Max</span>
          <span className="font-semibold text-gray-900">${plan.monthlyPremium * 12}</span>
        </div>
      </div>

      {/* Footer link */}
      <button className="w-full text-xs text-[#2563EB] hover:text-[#1d4ed8] font-medium flex items-center justify-center gap-1 py-2 border-t border-gray-100 -mx-6 px-6 -mb-6 pb-4 mt-4">
        View details
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
};
