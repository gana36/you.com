import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Check } from 'lucide-react';

export interface County {
  name: string;
  state: string;
  population: number;
  availablePlans: number;
}

interface CountySearchProps {
  onSelect: (county: County) => void;
  counties: County[];
}

export const CountySearch: React.FC<CountySearchProps> = ({ onSelect, counties }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCounties = counties.filter(county =>
    county.name.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSelect = (county: County) => {
    setSelectedCounty(county);
    setSearchTerm(`${county.name}, ${county.state}`);
    setIsOpen(false);
    onSelect(county);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for a county..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {isOpen && filteredCounties.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {filteredCounties.map((county) => (
            <div
              key={`${county.name}-${county.state}`}
              onClick={() => handleSelect(county)}
              className="p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-900">{county.name} County</h4>
                    {selectedCounty?.name === county.name && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex gap-3 text-sm text-slate-600">
                    <span>{county.state}</span>
                    <span>•</span>
                    <span>Pop: {county.population.toLocaleString()}</span>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">
                      {county.availablePlans} plans
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
