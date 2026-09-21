'use client';

import React from 'react';
import { Landmark, RefreshCw, Radio } from 'lucide-react';

interface HeaderProps {
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Economic Command Center
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
              </span>
            </h1>
            <p className="text-xs text-slate-5-00 dark:text-slate-400">
              Trợ lý tài chính & tin tức chứng khoán cá nhân
            </p>
          </div>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="hidden md:inline-block text-xs text-slate-500 dark:text-slate-400">
              Cập nhật: <strong className="text-slate-700 dark:text-slate-300">{lastUpdated}</strong>
            </span>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
