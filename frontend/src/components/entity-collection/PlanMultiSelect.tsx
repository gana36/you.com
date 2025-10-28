import React, { useState } from 'react';
import { Check, Building2 } from 'lucide-react';
import { Plan } from './PlanAutocomplete';

interface PlanMultiSelectProps {
  plans: Plan[];
  onSelect: (selectedPlans: Plan[]) => void;
  maxSelections?: number;
}

export const PlanMultiSelect: React.FC<PlanMultiSelectProps> = ({
  plans,
  onSelect,
  maxSelections = 3
}) => {
  const [selectedPlans, setSelectedPlans] = useState<Plan[]>([]);

  const handleToggle = (plan: Plan) => {
    let newSelection: Plan[];
    
    if (selectedPlans.find(p => p.id === plan.id)) {
      newSelection = selectedPlans.filter(p => p.id !== plan.id);
    } else {
      if (selectedPlans.length >= maxSelections) {
        return;
      }
      newSelection = [...selectedPlans, plan];
    }
    
    setSelectedPlans(newSelection);
    onSelect(newSelection);
  };

  const handleClear = () => {
    setSelectedPlans([]);
    onSelect([]);
  };

  const getSelectionOrder = (planId: string): number => {
    const index = selectedPlans.findIndex(p => p.id === planId);
    return index >= 0 ? index + 1 : 0;
  };

  return (
    <div className="space-y-4">
      {selectedPlans.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            {selectedPlans.length} of {maxSelections} plans selected
          </span>
          <button
            onClick={handleClear}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const isSelected = selectedPlans.find(p => p.id === plan.id);
          const isDisabled = !isSelected && selectedPlans.length >= maxSelections;
          const order = getSelectionOrder(plan.id);

          return (
            <button
              key={plan.id}
              onClick={() => handleToggle(plan)}
              disabled={isDisabled}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : isDisabled
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {order}
                    </div>
                  )}
                </div>

                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                  {plan.logo ? (
                    <img src={plan.logo} alt={plan.carrier} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {plan.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">
                    {plan.carrier}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-slate-900">
                      ${plan.monthlyPremium}/mo
                    </span>
                    <span className="text-slate-600">
                      ${plan.deductible} deductible
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
