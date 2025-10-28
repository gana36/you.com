import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';
import { County } from '../entity-collection/CountySearch';

interface ProgressiveEntityCollectorProps {
  entityType: string;
  onCollect: (value: any) => void;
  plans?: Plan[];
  counties?: County[];
}

export const ProgressiveEntityCollector: React.FC<ProgressiveEntityCollectorProps> = ({
  entityType,
  onCollect,
  plans = [],
  counties = []
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const getPrompt = (): string => {
    const prompts: Record<string, string> = {
      'county': 'Which county?',
      'age': 'Your age?',
      'plans': 'Select plans to compare',
      'plan_name': 'Which plan?'
    };
    return prompts[entityType] || 'Enter value';
  };

  const getFilteredOptions = () => {
    if (entityType === 'plans' || entityType === 'plan_name') {
      return plans.filter(p => 
        p.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        p.carrier.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 4);
    }
    if (entityType === 'county') {
      return counties.filter(c => 
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 4);
    }
    return [];
  };

  const handleSelect = (value: any) => {
    onCollect(value);
    setInputValue('');
    setShowDropdown(false);
  };

  const filteredOptions = getFilteredOptions();

  return (
    <div className="inline-flex items-center gap-2 my-1">
      <span className="text-xs text-slate-600">{getPrompt()}</span>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue && entityType === 'age') {
              handleSelect(parseInt(inputValue));
            }
          }}
          placeholder={entityType === 'age' ? 'e.g., 35' : 'Type to search...'}
          className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none w-40"
          autoFocus
        />

        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {(entityType === 'plans' || entityType === 'plan_name') && filteredOptions.map((plan: any) => (
              <button
                key={plan.id}
                onClick={() => handleSelect(plan)}
                className="w-full px-2 py-1.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="text-xs font-medium text-slate-900">{plan.name}</div>
                <div className="text-xs text-slate-500">{plan.carrier} • ${plan.monthlyPremium}/mo</div>
              </button>
            ))}
            
            {entityType === 'county' && filteredOptions.map((county: any) => (
              <button
                key={county.name}
                onClick={() => handleSelect(county)}
                className="w-full px-2 py-1.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="text-xs font-medium text-slate-900">{county.name} County</div>
                <div className="text-xs text-slate-500">{county.availablePlans} plans</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {entityType === 'age' && (
        <div className="flex items-center gap-1">
          {[25, 35, 45, 55].map((age) => (
            <button
              key={age}
              onClick={() => handleSelect(age)}
              className="px-1.5 py-0.5 text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors"
            >
              {age}
            </button>
          ))}
        </div>
      )}

      <ArrowRight className="w-3 h-3 text-slate-400" />
    </div>
  );
};
