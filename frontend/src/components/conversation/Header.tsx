import React from 'react';
import { Activity, User } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="bg-[#2563EB] text-white px-6 py-4 shadow-sm flex-shrink-0">
      <div className="max-w-chat mx-auto flex items-center justify-between">
        {/* Left side: Logo and title */}
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6" />
          <h1 className="text-white">Health Insurance Copilot</h1>
        </div>

        {/* Right side: Powered by badge and avatar */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-3 py-1.5 rounded-full text-sm">
            Powered by you.com
          </div>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
