import React from 'react';
import { HelpCircle } from 'lucide-react';
import { CitationBadge } from '../conversation/CitationBadge';

interface FAQCardProps {
  term: string;
  definition: string;
  example?: {
    title: string;
    description: string;
  };
}

export const FAQCard: React.FC<FAQCardProps> = ({ term, definition, example }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-2 font-semibold text-lg">{term}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{definition}</p>
          </div>
        </div>

        {/* Citation badge */}
        <CitationBadge
          source="healthcare.gov"
          url="https://healthcare.gov/glossary"
          snippet="Official health insurance glossary"
          dateFound={new Date().toLocaleDateString()}
        />
      </div>

      {/* Example section */}
      {example && (
        <div className="mt-4 bg-warning-bg border border-warning-border rounded-lg p-4">
          <div className="text-xs font-medium text-warning-text mb-1">
            {example.title}
          </div>
          <div className="text-sm text-warning-text leading-relaxed">
            {example.description}
          </div>
        </div>
      )}
    </div>
  );
};
