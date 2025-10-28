import React from 'react';
import { Check, X, ExternalLink, Star } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';
import { SourceBadge } from '../conversation/SourceBadge';

interface PlanComparisonTableProps {
  plans: Plan[];
  recommendedPlanId?: string;
}

interface PlanDetail extends Plan {
  oopMax: number;
  primaryCopay: number;
  specialistCopay: number;
  erCopay: number;
  rating: number;
  pros: string[];
  cons: string[];
  source: {
    name: string;
    url: string;
    verified: boolean;
    year: string;
  };
}

export const PlanComparisonTable: React.FC<PlanComparisonTableProps> = ({
  plans,
  recommendedPlanId
}) => {
  // Mock detailed data
  const detailedPlans: PlanDetail[] = plans.map(plan => ({
    ...plan,
    oopMax: plan.deductible * 8,
    primaryCopay: 25,
    specialistCopay: 50,
    erCopay: 300,
    rating: 4.2 + Math.random() * 0.7,
    pros: ['Low copays', 'Wide network', 'Telehealth included'],
    cons: ['Higher deductible', 'Limited specialists'],
    source: {
      name: `${plan.carrier.toLowerCase().replace(/\s+/g, '')}.com`,
      url: `https://${plan.carrier.toLowerCase().replace(/\s+/g, '')}.com`,
      verified: true,
      year: '2025'
    }
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {detailedPlans.map((plan) => {
          const isRecommended = plan.id === recommendedPlanId;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-lg border-2 shadow-sm ${
                isRecommended ? 'border-blue-600' : 'border-slate-200'
              }`}
            >
              {isRecommended && (
                <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg flex items-center gap-2">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">Recommended</span>
                </div>
              )}

              <div className="p-4">
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {plan.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{plan.carrier}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {plan.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Premium */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Monthly Premium</div>
                  <div className="text-2xl font-bold text-slate-900">
                    ${plan.monthlyPremium}
                  </div>
                </div>

                {/* Key Numbers */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Deductible</span>
                    <span className="font-medium text-slate-900">${plan.deductible}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Out-of-Pocket Max</span>
                    <span className="font-medium text-slate-900">${plan.oopMax}</span>
                  </div>
                </div>

                {/* Copays */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-medium text-slate-700 mb-2">Copays</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Primary Care</span>
                      <span className="font-medium">${plan.primaryCopay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Specialist</span>
                      <span className="font-medium">${plan.specialistCopay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Emergency Room</span>
                      <span className="font-medium">${plan.erCopay}</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-700 mb-2">Key Benefits</div>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pros */}
                <div className="mb-3">
                  <div className="text-xs font-medium text-slate-700 mb-2">Pros</div>
                  <div className="space-y-1">
                    {plan.pros.map((pro, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{pro}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cons */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-slate-700 mb-2">Cons</div>
                  <div className="space-y-1">
                    {plan.cons.map((con, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600">{con}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Source */}
                <div className="mb-4">
                  <SourceBadge
                    source={plan.source.name}
                    url={plan.source.url}
                    verified={plan.source.verified}
                    year={plan.source.year}
                  />
                </div>

                {/* CTA */}
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                  See Full Details
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export Actions */}
      <div className="flex gap-3 justify-center">
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
          Export Comparison
        </button>
        <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
          Schedule Consultation
        </button>
      </div>
    </div>
  );
};
