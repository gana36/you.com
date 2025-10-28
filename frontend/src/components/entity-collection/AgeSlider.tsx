import React, { useState } from 'react';
import { User, Info } from 'lucide-react';

interface AgeSliderProps {
  onSelect: (age: number) => void;
  initialValue?: number;
}

export const AgeSlider: React.FC<AgeSliderProps> = ({ onSelect, initialValue = 35 }) => {
  const [age, setAge] = useState(initialValue);

  const handleChange = (value: number) => {
    setAge(value);
    onSelect(value);
  };

  const getAgeCategory = (age: number): string => {
    if (age < 26) return 'Young Adult';
    if (age < 40) return 'Adult';
    if (age < 55) return 'Middle Age';
    if (age < 65) return 'Pre-Medicare';
    return 'Medicare Eligible';
  };

  const getEstimatedPremium = (age: number): number => {
    // Simple estimation formula
    if (age < 30) return 250 + age * 2;
    if (age < 50) return 300 + age * 3;
    return 400 + age * 4;
  };

  const percentage = ((age - 18) / (100 - 18)) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900">{age}</div>
            <div className="text-sm text-slate-600">years old</div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-slate-600">Age Category</div>
          <div className="text-lg font-semibold text-blue-600">{getAgeCategory(age)}</div>
        </div>
      </div>

      <div className="relative pt-2">
        <div className="relative h-2 bg-slate-200 rounded-full">
          <div
            className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
          <input
            type="range"
            min={18}
            max={100}
            value={age}
            onChange={(e) => handleChange(parseInt(e.target.value))}
            className="absolute w-full h-2 opacity-0 cursor-pointer"
            style={{ top: 0, left: 0 }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md"
            style={{ left: `calc(${percentage}% - 10px)` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>18</span>
          <span>100</span>
        </div>
      </div>

      <div className="flex gap-2">
        {[25, 35, 45, 55, 65].map((quickAge) => (
          <button
            key={quickAge}
            onClick={() => handleChange(quickAge)}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              age === quickAge
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {quickAge}
          </button>
        ))}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Estimated Monthly Premium: ${getEstimatedPremium(age)}</p>
            <p className="text-blue-700">
              {age < 26 && "You may be eligible to stay on a parent's plan until age 26"}
              {age >= 26 && age < 65 && "Individual marketplace plans are available for your age group"}
              {age >= 65 && "You're eligible for Medicare. Consider Medicare Advantage plans"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
