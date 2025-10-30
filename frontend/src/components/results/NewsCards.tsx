import React from 'react';
import { ExternalLink, Calendar, Globe } from 'lucide-react';

interface NewsArticle {
  headline: string;
  summary: string;
  source: string;
  date: string;
  url: string;
  favicon?: string;
}

interface NewsCardsProps {
  articles: NewsArticle[];
  onArticleClick?: (index: number) => void;
}

export const NewsCards: React.FC<NewsCardsProps> = ({ articles, onArticleClick }) => {
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
      <div className="flex gap-4 sm:gap-6 pb-4">
        {articles.map((article, idx) => (
          <button
            key={idx}
            onClick={() => onArticleClick?.(idx)}
            className="w-80 sm:w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:border-[#2563EB] hover:shadow-md transition-all group text-left"
          >
            {/* External link icon */}
            <div className="flex justify-end mb-3">
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-[#2563EB]" />
            </div>

            {/* Headline */}
            <h4 className="text-gray-900 mb-2 sm:mb-3 line-clamp-2 text-base sm:text-lg font-medium">
              {article.headline}
            </h4>

            {/* Summary */}
            <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-3 leading-relaxed text-sm">
              {article.summary}
            </p>

            {/* Source and date */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 pt-2 sm:pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {article.favicon ? (
                  <img src={article.favicon} alt="" className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>{article.source}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{article.date}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
