import React from 'react';
import { NewsCategory } from '@/types';

interface Props {
  category: NewsCategory;
  className?: string;
}

export const CategoryBadge: React.FC<Props> = ({ category, className = "" }) => {
  switch (category) {
    case 'MACRO':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          🔴 Vĩ Mô & Chính Sách
        </span>
      );
    case 'MARKET':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          🔵 Thị Trường & Ngành
        </span>
      );
    case 'ENTERPRISE':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          🟢 Doanh Nghiệp
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 ${className}`}>
          Tin tức
        </span>
      );
  }
};
