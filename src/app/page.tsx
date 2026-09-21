'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { NewsFeed } from '@/components/NewsFeed';
import { PortfolioTracker } from '@/components/PortfolioTracker';
import { SSIBoard } from '@/components/SSIBoard';
import { StockRadar } from '@/components/StockRadar';
import { StockDetailModal } from '@/components/StockDetailModal';
import { NewsArticle } from '@/types';
import { StockQuote, CompanyProfile, StocksDataPayload } from '@/types/stock';
import { getBasePath } from '@/utils/path';
import { BarChart3, Newspaper, Sparkles } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'RADAR' | 'SSIBOARD' | 'NEWS_PORTFOLIO'>('RADAR');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [stocksData, setStocksData] = useState<StocksDataPayload | null>(null);
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const basePath = getBasePath();
    
    // 1. Fetch News
    try {
      const resNews = await fetch(`${basePath}/data/news.json?t=` + Date.now());
      if (resNews.ok) {
        const data: NewsArticle[] = await resNews.json();
        setArticles(data && data.length > 0 ? data : SAMPLE_NEWS);
      } else {
        setArticles(SAMPLE_NEWS);
      }
    } catch {
      setArticles(SAMPLE_NEWS);
    }

    // 2. Fetch Stocks
    try {
      const resStocks = await fetch(`${basePath}/data/stocks.json?t=` + Date.now());
      if (resStocks.ok) {
        const data: StocksDataPayload = await resStocks.json();
        setStocksData(data);
      }
    } catch {
      // ignore
    }

    // 3. Fetch Company Profiles
    try {
      const resProfiles = await fetch(`${basePath}/data/company_profiles.json?t=` + Date.now());
      if (resProfiles.ok) {
        const data = await resProfiles.json();
        setProfiles(data || {});
      }
    } catch {
      // ignore
    }

    setIsLoading(false);
    setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allStocks = stocksData?.all || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Bar Navigation */}
      <Header
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        isRefreshing={isLoading}
      />

      {/* Mode Switcher Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'RADAR'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            🎯 Radar Đột Biến & Đầu Tư Hôm Nay
          </button>

          <button
            onClick={() => setActiveTab('SSIBOARD')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SSIBOARD'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Bảng Giá Trực Tuyến SSI (VN-Index)
          </button>

          <button
            onClick={() => setActiveTab('NEWS_PORTFOLIO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'NEWS_PORTFOLIO'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Tin Tức Kinh Tế & Danh Mục Cá Nhân
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* VIEW 1: RADAR CỔ PHIẾU TIỀM NĂNG & ĐỘT BIẾN */}
        {activeTab === 'RADAR' && (
          <section className="space-y-4">
            <StockRadar
              stocks={allStocks}
              profiles={profiles}
              articles={articles}
              onSelectStock={(stk) => setSelectedStock(stk)}
            />
          </section>
        )}

        {/* VIEW 2: BẢNG GIÁ ĐIỆN TỬ SSI IBOARD */}
        {activeTab === 'SSIBOARD' && (
          <section className="space-y-4">
            <SSIBoard initialData={stocksData || undefined} articles={articles} />
          </section>
        )}

        {/* VIEW 3: TIN TỨC KINH TẾ & SỔ LỆNH DANH MỤC */}
        {activeTab === 'NEWS_PORTFOLIO' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  📰 Bảng Tin Kinh Tế & Thị Trường
                </h2>
                <span className="text-xs text-slate-400">
                  Hiển thị {articles.length} bản tin mới nhất
                </span>
              </div>

              <NewsFeed articles={articles} isLoading={isLoading} />
            </section>

            <section className="lg:col-span-4 space-y-4">
              <div className="sticky top-20">
                <PortfolioTracker stocks={allStocks} />
              </div>
            </section>
          </div>
        )}

        {/* Global Stock Detail Modal (TradingView Candlestick + Financial Evaluation) */}
        {selectedStock && (
          <StockDetailModal
            stock={selectedStock}
            onClose={() => setSelectedStock(null)}
            articles={articles}
          />
        )}
      </main>
    </div>
  );
}
