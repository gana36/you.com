import React from 'react';
import { Activity, User } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="bg-[#2563EB] text-white px-4 sm:px-6 py-3 sm:py-4 shadow-sm flex-shrink-0">
      <div className="max-w-chat mx-auto flex items-center justify-between">
        {/* Left side: Logo and title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          <h1 className="text-white text-base sm:text-xl md:text-2xl font-semibold">Health Insurance Copilot</h1>
        </div>

        {/* Right side: Powered by badge and avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block bg-white/10 px-3 py-1.5 rounded-full text-xs sm:text-sm">
            Powered by you.com
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
