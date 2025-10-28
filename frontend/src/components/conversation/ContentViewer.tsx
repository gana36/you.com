import React from 'react';
import { X, Calendar, Globe, MapPin, Phone, Mail, ExternalLink } from 'lucide-react';

export type ContentType = 'news' | 'provider' | 'plan' | 'faq';

interface NewsContent {
  type: 'news';
  headline: string;
  date: string;
  source: string;
  author?: string;
  content: string;
  url: string;
}

interface ProviderContent {
  type: 'provider';
  name: string;
  specialty: string;
  location: string;
  phone?: string;
  email?: string;
  bio: string;
  education: string[];
  acceptingPatients: boolean;
  languages: string[];
  coveredPlans: string[];
}

interface PlanContent {
  type: 'plan';
  name: string;
  carrier: string;
  description: string;
  benefits: { category: string; details: string }[];
  network: string;
  documents: { name: string; url: string }[];
}

interface FAQContent {
  type: 'faq';
  term: string;
  definition: string;
  details: string;
  relatedTerms: string[];
}

type Content = NewsContent | ProviderContent | PlanContent | FAQContent;

interface ContentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  content: Content | null;
}

export const ContentViewer: React.FC<ContentViewerProps> = ({ isOpen, onClose, content }) => {
  if (!isOpen || !content) return null;

  const renderContent = () => {
    switch (content.type) {
      case 'news':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">{content.headline}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{content.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>{content.source}</span>
                </div>
                {content.author && <span>By {content.author}</span>}
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">{content.content}</div>
            </div>
            <a
              href={content.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#2563EB] hover:underline text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Read full article
            </a>
          </div>
        );

      case 'provider':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">{content.name}</h1>
              <p className="text-lg text-gray-600">{content.specialty}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-gray-700">{content.location}</span>
              </div>
              {content.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{content.phone}</span>
                </div>
              )}
              {content.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{content.email}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">About</h3>
              <p className="text-gray-700 leading-relaxed">{content.bio}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Education & Training</h3>
              <ul className="space-y-1">
                {content.education.map((edu, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">• {edu}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {content.languages.map((lang, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Accepted Plans</h3>
              <div className="space-y-1">
                {content.coveredPlans.map((plan, idx) => (
                  <div key={idx} className="text-gray-700 text-sm">• {plan}</div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22C55E]/10 text-[#22C55E] rounded-lg text-sm font-medium">
                {content.acceptingPatients ? '✓ Accepting new patients' : 'Not accepting new patients'}
              </div>
            </div>
          </div>
        );

      case 'plan':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">{content.name}</h1>
              <p className="text-lg text-gray-600">{content.carrier}</p>
            </div>

            <p className="text-gray-700 leading-relaxed">{content.description}</p>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Benefits & Coverage</h3>
              <div className="space-y-3">
                {content.benefits.map((benefit, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="font-medium text-gray-900 mb-1">{benefit.category}</div>
                    <div className="text-sm text-gray-600">{benefit.details}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Network Type</h3>
              <p className="text-gray-700">{content.network}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Plan Documents</h3>
              <div className="space-y-2">
                {content.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#2563EB] hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {doc.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-4">{content.term}</h1>
              <p className="text-lg text-gray-700 leading-relaxed">{content.definition}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">More Details</h3>
              <p className="text-gray-700 leading-relaxed">{content.details}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Related Terms</h3>
              <div className="flex flex-wrap gap-2">
                {content.relatedTerms.map((term, idx) => (
                  <button
                    key={idx}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Slide-in Drawer from Right */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-drawer bg-white shadow-xl z-50 flex flex-col border-l border-gray-200 animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900 font-medium">Content Viewer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderContent()}
        </div>

        {/* Footer disclaimer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            All information is sourced from verified health insurance providers and official government websites. 
            Always verify details directly with your insurance provider.
          </p>
        </div>
      </div>
    </>
  );
};
