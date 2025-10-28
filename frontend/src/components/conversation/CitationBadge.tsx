import React, { useState, useRef, useEffect } from 'react';
import { Globe, ExternalLink } from 'lucide-react';

interface CitationBadgeProps {
  source: string;
  url: string;
  snippet?: string;
  dateFound?: string;
  favicon?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  source,
  url,
  snippet,
  dateFound,
  favicon
}) => {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-full text-xs hover:bg-[#2563EB]/20 transition-colors"
      >
        <Globe className="w-3 h-3" />
        <span>Live from you.com</span>
      </button>

      {showPopover && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4">
          <div className="space-y-3">
            {/* Source header */}
            <div className="flex items-center gap-2">
              {favicon ? (
                <img src={favicon} alt="" className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-medium text-sm text-gray-900">{source}</span>
            </div>

            {/* Snippet */}
            {snippet && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
                {snippet}
              </div>
            )}

            {/* URL */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1d4ed8] break-all"
            >
              <span>{truncateUrl(url)}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>

            {/* Date found */}
            {dateFound && (
              <div className="text-xs text-gray-500">
                Found: {dateFound}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
