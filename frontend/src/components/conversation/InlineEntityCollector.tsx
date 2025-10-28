import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Plan } from '../entity-collection/PlanAutocomplete';
import { County } from '../entity-collection/CountySearch';

interface InlineEntityCollectorProps {
  missingEntities: string[];
  onCollect: (data: Record<string, any>) => void;
  plans: Plan[];
  counties: County[];
}

export const InlineEntityCollector: React.FC<InlineEntityCollectorProps> = ({
  missingEntities,
  onCollect,
  plans,
  counties
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const currentEntity = missingEntities[currentStep];

  const handleSelect = (value: any) => {
    const newData = { ...collectedData, [currentEntity]: value };
    setCollectedData(newData);
    setInputValue('');
    setShowDropdown(false);

    if (currentStep < missingEntities.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onCollect(newData);
    }
  };

  const getPlaceholder = (entity: string): string => {
    const placeholders: Record<string, string> = {
      'plans': 'Select plans to compare...',
      'county': 'Which county?',
      'age': 'Your age?'
    };
    return placeholders[entity] || 'Enter value...';
  };

  const getFilteredOptions = () => {
    if (currentEntity === 'plans') {
      return plans.filter(p => 
        p.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        p.carrier.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
    }
    if (currentEntity === 'county') {
      return counties.filter(c => 
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 5);
    }
    return [];
  };

  const filteredOptions = getFilteredOptions();

  return (
    <div className="inline-flex items-center gap-2 py-1">
      <span className="text-sm text-slate-600">I need:</span>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={getPlaceholder(currentEntity)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-48"
          autoFocus
        />

        {showDropdown && filteredOptions.length > 0 && (
          <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {currentEntity === 'plans' && filteredOptions.map((plan: any) => (
              <button
                key={plan.id}
                onClick={() => handleSelect(plan)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm"
              >
                <div className="font-medium text-slate-900">{plan.name}</div>
                <div className="text-xs text-slate-600">{plan.carrier} • ${plan.monthlyPremium}/mo</div>
              </button>
            ))}
            
            {currentEntity === 'county' && filteredOptions.map((county: any) => (
              <button
                key={county.name}
                onClick={() => handleSelect(county)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm"
              >
                <div className="font-medium text-slate-900">{county.name} County</div>
                <div className="text-xs text-slate-600">{county.availablePlans} plans available</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {currentEntity === 'age' && (
        <div className="flex items-center gap-2">
          {[25, 35, 45, 55, 65].map((age) => (
            <button
              key={age}
              onClick={() => handleSelect(age)}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors"
            >
              {age}
            </button>
          ))}
        </div>
      )}

      {currentStep < missingEntities.length - 1 && (
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
      )}
    </div>
  );
};
