import React from 'react';
import { Building2, Star, ExternalLink } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';
import { SourceBadge } from '../conversation/SourceBadge';

interface PlanDetailCardProps {
  plan: Plan;
}

export const PlanDetailCard: React.FC<PlanDetailCardProps> = ({ plan }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
          {plan.logo ? (
            <img src={plan.logo} alt={plan.carrier} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Building2 className="w-8 h-8" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded">
              {plan.type}
            </span>
          </div>
          <p className="text-slate-600">{plan.carrier}</p>
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-slate-700">4.5</span>
            <span className="text-sm text-slate-500">(1,234 reviews)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-700 mb-1">Monthly Premium</div>
          <div className="text-2xl font-bold text-blue-900">${plan.monthlyPremium}</div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600 mb-1">Deductible</div>
          <div className="text-2xl font-bold text-slate-900">${plan.deductible}</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-700 mb-2">Key Features</h4>
        <div className="flex flex-wrap gap-2">
          {plan.features.map((feature, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <SourceBadge
          source={`${plan.carrier.toLowerCase().replace(/\s+/g, '')}.com`}
          url={`https://${plan.carrier.toLowerCase().replace(/\s+/g, '')}.com`}
          verified={true}
          year="2025"
        />
      </div>

      <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
        View Full Details
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
};
