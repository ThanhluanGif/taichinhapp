'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { NewsFeed } from '@/components/NewsFeed';
import { PortfolioTracker } from '@/components/PortfolioTracker';
import { NewsArticle } from '@/types';

// Sample fallback news in case news.json is fetching or empty
const SAMPLE_NEWS: NewsArticle[] = [
  {
    id: 'sample-1',
    title: 'Ngân hàng Nhà nước giữ nguyên lãi suất điều hành, ưu tiên duy trì tỷ giá ổn định',
    link: 'https://cafef.vn/kinh-te-vi-mo.rss',
    summary: 'NHNN tiếp tục theo sát diễn biến kinh tế vĩ mô toàn cầu, giữ nguyên các mức lãi suất điều hành nhằm hỗ trợ doanh nghiệp phục hồi sản xuất kinh doanh đồng thời kiểm soát lạm phát.',
    source: 'CafeF',
    category: 'MACRO',
    published_at: 'Hôm nay, 14:30',
  },
  {
    id: 'sample-2',
    title: 'VN-Index vượt mốc 1.280 điểm nhờ lực cầu sôi động ở nhóm cổ phiếu Ngân hàng & Bất động sản',
    link: 'https://cafef.vn/thi-truong-chung-khoan.rss',
    summary: 'Dòng tiền nội tiếp tục lan tỏa tích cực trên toàn thị trường, khối ngoại thu hẹp đà bán ròng giúp chỉ số VN-Index đóng cửa tại mức cao nhất tuần.',
    source: 'Vietstock',
    category: 'MARKET',
    published_at: 'Hôm nay, 15:00',
  },
  {
    id: 'sample-3',
    title: 'FPT công bố doanh thu 8 tháng đạt 37.000 tỷ đồng, lợi luận trước thuế tăng 19% so với cùng kỳ',
    link: 'https://cafef.vn/doanh-nghiep.rss',
    summary: 'Khối Công nghệ tiếp tục là động lực tăng trưởng chính của Tập đoàn FPT với các hợp đồng chuyển đổi số quốc tế ký mới tăng trưởng mạnh mẽ.',
    source: 'VnEconomy',
    category: 'ENTERPRISE',
    published_at: 'Hôm nay, 11:15',
  },
];

export default function Home() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/data/news.json?t=' + Date.now());
      if (res.ok) {
        const data: NewsArticle[] = await res.json();
        if (data && data.length > 0) {
          setArticles(data);
        } else {
          setArticles(SAMPLE_NEWS);
        }
      } else {
        setArticles(SAMPLE_NEWS);
      }
    } catch {
      setArticles(SAMPLE_NEWS);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Bar Navigation */}
      <Header
        lastUpdated={lastUpdated}
        onRefresh={fetchNews}
        isRefreshing={isLoading}
      />

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: News Feed (8 Columns on Desktop) */}
          <section className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                📰 Bảng Tin Kinh Tế & Thị Trường
              </h2>
              <span className="text-xs text-slate-400">
                Hiển thị {articles.length} bản tin mới nhất
              </span>
            </div>

            <NewsFeed articles={articles} isLoading={isLoading} />
          </section>

          {/* Right Column: Portfolio Tracker (4 Columns on Desktop) */}
          <section className="lg:col-span-4 space-y-4">
            <div className="sticky top-20">
              <PortfolioTracker />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
