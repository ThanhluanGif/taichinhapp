'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getBasePath } from '@/utils/path';
import { RefreshCw, Radio, ShieldCheck, Clock, Terminal } from 'lucide-react';

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
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const basePath = getBasePath();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070A0F]/85 border-b border-slate-800/80 transition-all shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity & Logo */}
        <div className="flex items-center space-x-3.5">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 shadow-md shadow-amber-500/20 flex-shrink-0 group">
            <Image
              src={`${basePath}/assets/images/logo.jpg`}
              alt="VNStock Terminal Logo"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                VNSTOCK
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">
                  TERMINAL
                </span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> SSI Direct Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              Hệ thống phân tích kỹ thuật & dòng tiền chứng khoán Việt Nam
            </p>
          </div>
        </div>

        {/* Right: Terminal Clock, Market State & Refresh Action */}
        <div className="flex items-center space-x-3">
          {/* Live Market Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime || '09:00:00'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              HOSE
            </span>
          </div>

          {/* Last sync time */}
          {lastUpdated && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Đồng bộ: <strong className="text-slate-200">{lastUpdated}</strong>
            </span>
          )}

          {/* Manual Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 active:scale-95 disabled:opacity-50"
              title="Làm mới toàn bộ dữ liệu thị trường"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới dữ liệu</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
