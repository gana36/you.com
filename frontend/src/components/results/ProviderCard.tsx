import React from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { CitationBadge } from '../conversation/CitationBadge';

interface ProviderCardProps {
  name: string;
  specialty: string;
  location: string;
  acceptingNewPatients: boolean;
  coveredPlans: string[];
  initials?: string;
  onClick?: () => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  name,
  specialty,
  location,
  acceptingNewPatients,
  coveredPlans,
  initials,
  onClick
}) => {
  const getInitials = () => {
    if (initials) return initials;
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[#2563EB] transition-all text-left"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar circle */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1d4ed8] flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
            {getInitials()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 mb-1 font-semibold">{name}</h4>
            <p className="text-sm text-gray-600 mb-1">{specialty}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        {/* Citation badge */}
        <CitationBadge
          source="cigna.com"
          url="https://cigna.com/provider-directory"
          snippet="Provider directory information"
          dateFound={new Date().toLocaleDateString()}
        />
      </div>

      {/* Status */}
      {acceptingNewPatients && (
        <div className="mb-4 flex items-center gap-1.5 text-sm text-[#22C55E]">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-medium">Accepting new patients</span>
        </div>
      )}

      {/* Plan badges */}
      <div className="flex flex-wrap gap-2">
        {coveredPlans.map((plan, idx) => (
          <span
            key={idx}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full"
          >
            {plan}
          </span>
        ))}
      </div>
    </button>
  );
};
