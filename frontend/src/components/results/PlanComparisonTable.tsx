import React from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';

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
    oopMax: plan.deductible * 2,
    primaryCopay: 25,
    specialistCopay: 45,
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

  const rows = [
    { label: 'Tier', getValue: (plan: PlanDetail) => plan.type },
    { label: 'Deductible', getValue: (plan: PlanDetail) => `$${plan.deductible}` },
    { label: 'OOP Max', getValue: (plan: PlanDetail) => `$${plan.oopMax}` },
    { label: 'PCP Copay', getValue: (plan: PlanDetail) => `$${plan.primaryCopay}` },
    { label: 'Specialist Copay', getValue: (plan: PlanDetail) => `$${plan.specialistCopay}` },
    { label: 'Coinsurance', getValue: () => '20%' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">Feature</th>
              {detailedPlans.map((plan) => {
                const isRecommended = plan.id === recommendedPlanId;
                return (
                  <th key={plan.id} className="px-3 sm:px-5 py-3 sm:py-4 text-left min-w-[180px] sm:min-w-[200px]">
                    <div className="space-y-2">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{plan.name}</div>
                        <div className="text-xs text-gray-500 font-normal mt-0.5">{plan.carrier}</div>
                      </div>
                      {isRecommended && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#22C55E]/10 text-[#22C55E] text-xs font-medium rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Best Value
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 sm:px-5 py-3 sm:py-4 text-center min-w-[100px] sm:min-w-[120px]">
                <button className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs text-[#2563EB] hover:bg-[#2563EB]/10 rounded-full transition-colors">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add plan</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0">
                <td className="px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 sticky left-0 bg-white z-10">{row.label}</td>
                {detailedPlans.map((plan) => (
                  <td key={plan.id} className="px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-gray-900">
                    {row.getValue(plan)}
                  </td>
                ))}
                <td className="px-3 sm:px-5 py-2.5 sm:py-3"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
