import React, { useState, useEffect } from 'react';
import { X, Calendar, Globe, MapPin, Phone, Mail, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export type ContentType = 'news' | 'provider' | 'plan' | 'faq';

interface NewsContent {
  type: 'news';
  headline?: string;
  title?: string;
  date?: string;
  source: string;
  author?: string;
  authors?: string[];
  content: string;
  snippets?: string[];
  thumbnail?: string;
  url: string;
  loading?: boolean;
  enhancedSummary?: string | null;
  keyPoints?: string[] | null;
  insights?: string;
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
  topic: string;
  definition: string;
  explanation: string;
  example: string;
  keyPoints: string[];
  relatedTopics: string[];
  sources: { title: string; url: string; source: string }[];
  loading?: boolean;
}

type Content = NewsContent | ProviderContent | PlanContent | FAQContent;

interface ContentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  content: Content | null;
}

export const ContentViewer: React.FC<ContentViewerProps> = ({ isOpen, onClose, content }) => {
  const [iframeError, setIframeError] = useState(false);

  // Reset iframe error when content changes or viewer closes
  useEffect(() => {
    setIframeError(false);
  }, [content, isOpen]);

  if (!isOpen || !content) return null;

  const renderContent = () => {
    switch (content.type) {
      case 'news':
        const hasSnippets = content.snippets && content.snippets.length > 0;
        const hasEnhanced = content.enhancedSummary || content.keyPoints;
        const authorsList = content.authors && content.authors.length > 0 
          ? content.authors.join(', ') 
          : content.author;

        return (
          <article className="max-w-3xl mx-auto">
            {/* Article Header */}
            <header className="mb-6">
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4 leading-tight">
                {content.headline || content.title || 'Article'}
              </h1>
              
              {/* Metadata bar - Google style */}
              <div className="flex items-center gap-3 text-sm text-gray-600 pb-4 mb-4 border-b border-gray-200">
                <a 
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-medium text-gray-900 hover:underline"
                >
                  <Globe className="w-4 h-4" />
                  {content.source}
                </a>
                {content.date && (
                  <>
                    <span className="text-gray-400">·</span>
                    <time className="text-gray-600">{content.date}</time>
                  </>
                )}
                {authorsList && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{authorsList}</span>
                  </>
                )}
              </div>
            </header>

            {/* Featured Image */}
            {content.thumbnail && (
              <figure className="mb-6">
                <img 
                  src={content.thumbnail} 
                  alt={content.headline || content.title} 
                  className="w-full h-auto rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </figure>
            )}

            {/* Article Body */}
            <div className="prose prose-lg max-w-none">
              {content.loading ? (
                <div className="flex items-center gap-3 py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading article content...</span>
                </div>
              ) : hasEnhanced ? (
                <>
                  {/* Enhanced summary - looks like article text */}
                  {content.enhancedSummary && (
                    <div className="mb-8">
                      <p className="text-lg text-gray-900 leading-relaxed whitespace-pre-line font-serif">
                        {content.enhancedSummary}
                      </p>
                    </div>
                  )}

                  {/* Key points - clean list style */}
                  {content.keyPoints && content.keyPoints.length > 0 && (
                    <div className="my-8 pl-4 border-l-2 border-gray-300">
                      <ul className="space-y-3">
                        {content.keyPoints.map((point, idx) => (
                          <li key={idx} className="text-base text-gray-800 leading-relaxed list-disc ml-4">
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Additional insights */}
                  {content.insights && (
                    <div className="my-8">
                      <p className="text-base text-gray-800 leading-relaxed font-serif">
                        {content.insights}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-lg text-gray-900 leading-relaxed font-serif">
                  {content.content}
                </p>
              )}

              {/* Excerpts from original - integrated naturally */}
              {hasSnippets && (
                <div className="my-8 space-y-6">
                  {content.snippets.map((snippet, idx) => (
                    <p key={idx} className="text-base text-gray-800 leading-relaxed font-serif">
                      {snippet}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with source link - minimal Google style */}
            <footer className="mt-12 pt-6 border-t border-gray-200">
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <span>Read full article on {content.source}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </footer>
          </article>
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
          <article className="max-w-3xl mx-auto">
            {/* Loading State */}
            {content.loading ? (
              <div className="flex items-center gap-3 py-8 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Synthesizing comprehensive answer...</span>
              </div>
            ) : (
              <>
                {/* Topic Header */}
                <header className="mb-6 pb-6 border-b border-gray-200">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{content.topic}</h1>
                  <div className="text-lg text-gray-700 leading-relaxed font-medium prose prose-lg max-w-none">
                    <ReactMarkdown>{content.definition}</ReactMarkdown>
                  </div>
                </header>

                {/* Detailed Explanation */}
                {content.explanation && (
                  <div className="prose prose-lg max-w-none mb-8">
                    <div className="text-base text-gray-800 leading-relaxed font-serif">
                      <ReactMarkdown>{content.explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Example Section */}
                {content.example && (
                  <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-5 mb-8">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wide">
                      Example
                    </h3>
                    <div className="text-base text-gray-800 leading-relaxed font-serif prose prose-sm max-w-none">
                      <ReactMarkdown>{content.example}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Key Points */}
                {content.keyPoints && content.keyPoints.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Points</h3>
                    <ul className="space-y-3">
                      {content.keyPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                          <div className="text-base text-gray-700 leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown>{point}</ReactMarkdown>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related Topics */}
                {content.relatedTopics && content.relatedTopics.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">Related Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {content.relatedTopics.map((topic, idx) => (
                        <button
                          key={idx}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources Footer */}
                {content.sources && content.sources.length > 0 && (
                  <footer className="mt-12 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-3">Sources</h3>
                    <div className="space-y-2">
                      {content.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline group"
                        >
                          <span className="flex-shrink-0 text-gray-400 font-mono text-xs mt-0.5">
                            [{idx + 1}]
                          </span>
                          <span className="flex-1">{source.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </footer>
                )}
              </>
            )}
          </article>
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
