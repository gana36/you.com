import React, { useState } from 'react';
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
      'plan_name': 'Which plan?',
      'insurer': 'Which insurance company?',
      'year': 'Which year?',
      'income': 'Annual income?',
      'coverage_item': 'What coverage item?',
      'subtype': 'Specify subtype:',
      'provider_name': 'Provider name?',
      'specialty': 'Medical specialty?',
      'features': 'Features to compare?',
      'topic': 'Topic?',
      'state': 'Which state?'
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
    <div className="flex items-center gap-3 my-3">
      <span className="text-sm text-gray-600">{getPrompt()}</span>
      
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
            if (e.key === 'Enter' && inputValue) {
              if (entityType === 'age' || entityType === 'income' || entityType === 'year') {
                handleSelect(parseInt(inputValue));
              } else {
                handleSelect(inputValue);
              }
            }
          }}
          placeholder={
            entityType === 'age' ? 'e.g., 35' :
            entityType === 'income' ? 'e.g., 50000' :
            entityType === 'year' ? 'e.g., 2025' :
            'Type to search...'
          }
          className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none w-48 bg-white"
          autoFocus
        />

        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {(entityType === 'plans' || entityType === 'plan_name') && filteredOptions.map((plan: any) => (
              <button
                key={plan.id}
                onClick={() => handleSelect(plan)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{plan.carrier} • ${plan.monthlyPremium}/mo</div>
              </button>
            ))}
            
            {entityType === 'county' && filteredOptions.map((county: any) => (
              <button
                key={county.name}
                onClick={() => handleSelect(county)}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{county.name} County</div>
                <div className="text-xs text-gray-500 mt-0.5">{county.availablePlans} plans</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {entityType === 'age' && (
        <div className="flex items-center gap-2">
          {[25, 35, 45, 55].map((age) => (
            <button
              key={age}
              onClick={() => handleSelect(age)}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-gray-700 rounded-lg border border-gray-200 hover:border-[#2563EB] transition-all"
            >
              {age}
            </button>
          ))}
        </div>
      )}

      {entityType === 'year' && (
        <div className="flex items-center gap-2">
          {[2024, 2025].map((year) => (
            <button
              key={year}
              onClick={() => handleSelect(year)}
              className="px-3 py-1.5 text-sm bg-gray-50 hover:bg-[#2563EB]/10 hover:text-[#2563EB] text-gray-700 rounded-lg border border-gray-200 hover:border-[#2563EB] transition-all"
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
