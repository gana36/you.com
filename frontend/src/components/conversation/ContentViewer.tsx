import React, { useState, useEffect } from 'react';
import { X, Calendar, Globe, MapPin, Phone, Mail, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export type ContentType = 'news' | 'provider' | 'plan' | 'faq' | 'sources';

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
  title?: string;
  name?: string;
  carrier?: string;
  description?: string;
  benefits?: { category: string; details: string }[];
  network?: string;
  documents?: { name: string; url: string }[];
  data?: any;
  sources?: any[];
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

interface SourcesContent {
  type: 'sources';
  title: string;
  sources: any[];
  raw_results?: any;
  summary?: string;
  key_findings?: string[];
  recommendations?: string;
}

type Content = NewsContent | ProviderContent | PlanContent | FAQContent | SourcesContent;

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
        const planData = content.data || {};
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                {content.title || content.name || planData.plan_marketing_name || planData.plan_name}
              </h1>
              <p className="text-lg text-gray-600">
                {content.carrier || planData.issuer_name || planData.insurer}
              </p>
              <div className="flex gap-2 mt-2">
                {planData.metal_level && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {planData.metal_level} {planData.plan_type}
                  </span>
                )}
              </div>
            </div>

            {/* Pricing Section */}
            {(planData.monthly_premium_adult_40 || planData.premium_avg_40yr) && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Monthly Premiums by Age</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {planData.monthly_premium_adult_21 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 21</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_21}</span>
                    </div>
                  )}
                  {planData.monthly_premium_adult_27 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 27</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_27}</span>
                    </div>
                  )}
                  {planData.monthly_premium_adult_30 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 30</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_30}</span>
                    </div>
                  )}
                  {(planData.monthly_premium_adult_40 || planData.premium_avg_40yr) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 40</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_40 || planData.premium_avg_40yr}</span>
                    </div>
                  )}
                  {planData.monthly_premium_adult_50 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 50</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_50}</span>
                    </div>
                  )}
                  {planData.monthly_premium_adult_60 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Age 60</span>
                      <span className="font-semibold text-gray-900">${planData.monthly_premium_adult_60}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cost Sharing */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Cost Sharing</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {(planData.deductible_individual_in_network || planData.deductible_individual) && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Individual Deductible</div>
                    <div className="font-semibold text-lg text-gray-900">${planData.deductible_individual_in_network || planData.deductible_individual}</div>
                  </div>
                )}
                {(planData.out_of_pocket_max_individual_in_network || planData.out_of_pocket_max_individual) && (
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Out-of-Pocket Max</div>
                    <div className="font-semibold text-lg text-gray-900">${planData.out_of_pocket_max_individual_in_network || planData.out_of_pocket_max_individual}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Copays */}
            {(planData.copay_pcp || planData.pcp_office_visit_copay) && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Copayments</h3>
                <div className="space-y-2.5 text-sm">
                  {(planData.copay_pcp || planData.pcp_office_visit_copay) && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Primary Care Visit</span>
                      <span className="font-semibold text-gray-900">${planData.copay_pcp || planData.pcp_office_visit_copay}</span>
                    </div>
                  )}
                  {(planData.copay_specialist || planData.specialist_office_visit_copay) && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Specialist Visit</span>
                      <span className="font-semibold text-gray-900">${planData.copay_specialist || planData.specialist_office_visit_copay}</span>
                    </div>
                  )}
                  {planData.copay_er && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Emergency Room</span>
                      <span className="font-semibold text-gray-900">${planData.copay_er}</span>
                    </div>
                  )}
                  {planData.copay_urgent_care && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Urgent Care</span>
                      <span className="font-semibold text-gray-900">${planData.copay_urgent_care}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coverage */}
            {planData.coverage && planData.coverage.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Covered Services</h3>
                <div className="flex flex-wrap gap-2">
                  {planData.coverage.map((service: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Plan Summary */}
            {planData.text_chunk && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Plan Summary</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{planData.text_chunk}</p>
              </div>
            )}

            {/* Official Links */}
            {(planData.sbc_url || planData.official_source) && (
              <div className="space-y-2">
                {planData.sbc_url && (
                  <a
                    href={planData.sbc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Official Summary of Benefits & Coverage (SBC)
                  </a>
                )}
                {planData.official_source && (
                  <a
                    href={planData.official_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Healthcare.gov
                  </a>
                )}
              </div>
            )}
          </div>
        );

      case 'sources':
        return (
          <div className="space-y-8">
            {/* Key Findings Section */}
            {content.key_findings && content.key_findings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Key Findings</h3>
                <div className="space-y-3">
                  {content.key_findings.map((finding: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed flex-1">{finding}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Section */}
            {content.recommendations && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Recommendations</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 leading-relaxed">{content.recommendations}</p>
                </div>
              </div>
            )}

            {/* Dataset Sources */}
            {content.raw_results?.dataset_results && content.raw_results.dataset_results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Official Data Sources</h3>
                <div className="space-y-3">
                  {content.raw_results.dataset_results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{result.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{result.source}</p>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium uppercase tracking-wide">
                          {result.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">{result.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Web Sources */}
            {content.raw_results?.api_results && content.raw_results.api_results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Additional Web Sources</h3>
                <div className="space-y-3">
                  {content.raw_results.api_results.map((result: any, idx: number) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 group"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-600 group-hover:underline text-sm">{result.title}</h4>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{result.description}</p>
                          <p className="text-xs text-gray-400 mt-2">{result.url}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
