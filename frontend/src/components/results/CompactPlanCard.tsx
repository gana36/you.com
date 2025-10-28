import React from 'react';
import { Star, ExternalLink } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';

interface CompactPlanCardProps {
  plan: Plan;
  isRecommended?: boolean;
}

export const CompactPlanCard: React.FC<CompactPlanCardProps> = ({ plan, isRecommended }) => {
  return (
    <div className={`p-3 border rounded-lg hover:shadow-sm transition-shadow ${
      isRecommended ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
    }`}>
      {isRecommended && (
        <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
          <Star className="w-3 h-3 fill-blue-600" />
          Recommended
        </div>
      )}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-slate-900 truncate">{plan.name}</h4>
          <p className="text-xs text-slate-600">{plan.carrier}</p>
        </div>
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded ml-2 flex-shrink-0">
          {plan.type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="text-xs text-slate-500">Premium</div>
          <div className="font-bold text-slate-900">${plan.monthlyPremium}/mo</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Deductible</div>
          <div className="font-bold text-slate-900">${plan.deductible}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {plan.features.slice(0, 2).map((feature, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">
            {feature}
          </span>
        ))}
      </div>

      <button className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-1">
        View details
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
};
