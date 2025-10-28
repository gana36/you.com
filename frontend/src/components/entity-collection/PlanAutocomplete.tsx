import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, Building2 } from 'lucide-react';

export interface Plan {
  id: string;
  name: string;
  carrier: string;
  type: 'HMO' | 'PPO' | 'EPO';
  monthlyPremium: number;
  deductible: number;
  features: string[];
  logo?: string;
}

interface PlanAutocompleteProps {
  onSelect: (plan: Plan) => void;
  plans: Plan[];
}

export const PlanAutocomplete: React.FC<PlanAutocompleteProps> = ({ onSelect, plans }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.carrier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setSearchTerm(plan.name);
    setIsOpen(false);
    onSelect(plan);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a health plan..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {isOpen && filteredPlans.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => handleSelect(plan)}
              className="p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-start gap-3">
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
                    {plan.carrier} • ${plan.monthlyPremium}/mo • ${plan.deductible} deductible
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedPlan?.id === plan.id && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
