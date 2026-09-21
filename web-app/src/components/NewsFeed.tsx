'use client';

import React, { useState } from 'react';
import { NewsArticle, NewsCategory } from '@/types';
import { CategoryBadge } from './CategoryBadge';
import { Search, ExternalLink, Newspaper, Calendar, Filter } from 'lucide-react';

interface NewsFeedProps {
  articles: NewsArticle[];
  isLoading?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ articles, isLoading = false }) => {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = {
    ALL: articles.length,
    MACRO: articles.filter((a) => a.category === 'MACRO').length,
    MARKET: articles.filter((a) => a.category === 'MARKET').length,
    ENTERPRISE: articles.filter((a) => a.category === 'ENTERPRISE').length,
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tin tức vĩ mô, chứng khoán, mã cổ phiếu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Xóa
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <span className="text-slate-400 mr-1 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>

          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả ({categoryCounts.ALL})
          </button>

          <button
            onClick={() => setSelectedCategory('MACRO')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCategory === 'MACRO'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            🔴 Vĩ Mô ({categoryCounts.MACRO})
          </button>

          <button
            onClick={() => setSelectedCategory('MARKET')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCategory === 'MARKET'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
            }`}
          >
            🔵 Thị Trường ({categoryCounts.MARKET})
          </button>

          <button
            onClick={() => setSelectedCategory('ENTERPRISE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              selectedCategory === 'ENTERPRISE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            🟢 Doanh Nghiệp ({categoryCounts.ENTERPRISE})
          </button>
        </div>
      </div>

      {/* Articles List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <Newspaper className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Không tìm thấy bản tin nào
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="group p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row gap-4"
            >
              {/* Optional Thumbnail */}
              {article.image && (
                <div className="w-full sm:w-36 h-28 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <CategoryBadge category={article.category} />
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {article.source}
                    </span>
                    {article.published_at && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" />
                        {article.published_at}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-start justify-between gap-2"
                    >
                      <span>{article.title}</span>
                    </a>
                  </h2>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    Đọc báo gốc <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
