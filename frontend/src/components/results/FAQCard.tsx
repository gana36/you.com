import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL } from '../../config';

interface FAQCardProps {
  topic: string;
  searchResults: any[];
  onViewerOpen: (briefDefinition: string) => void;
}

export const FAQCard: React.FC<FAQCardProps> = ({ topic, searchResults, onViewerOpen }) => {
  const [briefAnswer, setBriefAnswer] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefAnswer = async () => {
      if (!searchResults || searchResults.length === 0) {
        setBriefAnswer('No information available');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching clean brief answer for:', topic);
        const response = await fetch(`${API_BASE_URL}/brief-faq`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic,
            search_results: searchResults
          })
        });
        const data = await response.json();
        
        const answer = data.brief_answer || searchResults[0]?.description || 'Click to see explanation';
        setBriefAnswer(answer);
        console.log('Brief answer received:', answer.substring(0, 100) + '...');
      } catch (error) {
        console.error('Error fetching brief answer:', error);
        setBriefAnswer(searchResults[0]?.description || 'Click to see explanation');
      } finally {
        setLoading(false);
      }
    };

    fetchBriefAnswer();
  }, [topic, searchResults]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Analyzing sources and preparing answer...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Main Answer - Self-sufficient */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {topic}
        </h3>
        <div className="text-base text-gray-800 leading-relaxed prose prose-base max-w-none">
          <ReactMarkdown>{briefAnswer}</ReactMarkdown>
        </div>
      </div>

      {/* Learn More CTA */}
      <button
        onClick={() => onViewerOpen(briefAnswer)}
        className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 transition-colors group flex items-center justify-between"
      >
        <span className="text-sm text-gray-700 font-medium">
          See detailed explanation with examples and sources
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </button>
    </div>
  );
};
