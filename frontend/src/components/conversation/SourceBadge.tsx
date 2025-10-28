import React from 'react';
import { ExternalLink, CheckCircle2, Globe } from 'lucide-react';

interface SourceBadgeProps {
  source: string;
  url?: string;
  verified: boolean;
  year: string;
  favicon?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  url,
  verified,
  year,
  favicon
}) => {
  const handleClick = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!url}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs hover:border-slate-300 hover:shadow-sm transition-all disabled:cursor-default"
    >
      {favicon ? (
        <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" />
      ) : (
        <Globe className="w-3.5 h-3.5 text-slate-400" />
      )}
      <span className="text-slate-700 font-medium">{source}</span>
      {verified && <CheckCircle2 className="w-3 h-3 text-green-600" />}
      <span className="text-slate-500">{year}</span>
      {url && <ExternalLink className="w-3 h-3 text-slate-400" />}
    </button>
  );
};
