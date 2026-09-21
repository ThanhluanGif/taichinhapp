'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { NewsFeed } from '@/components/NewsFeed';
import { PortfolioTracker } from '@/components/PortfolioTracker';
import { SSIBoard } from '@/components/SSIBoard';
import { StockRadar } from '@/components/StockRadar';
import { StockDetailModal } from '@/components/StockDetailModal';
import { NewsArticle } from '@/types';
import { StockQuote, CompanyProfile, StocksDataPayload } from '@/types/stock';
import { getBasePath } from '@/utils/path';
import { BarChart3, Newspaper, Sparkles, TrendingUp, Shield, Activity, Terminal } from 'lucide-react';

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
  const basePath = getBasePath();

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Subtle Background Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-900/15 via-indigo-900/5 to-transparent pointer-events-none blur-3xl z-0" />

      {/* Top Bar Navigation */}
      <Header
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        isRefreshing={isLoading}
      />

      {/* Hero Showcase Bar (Anti-AI Look: Bespoke Terminal Atmosphere) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 relative z-10">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0B1120] to-slate-950 p-4 sm:p-5 shadow-2xl">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none overflow-hidden hidden md:block">
            <Image
              src={`${basePath}/assets/images/hero_banner.jpg`}
              alt="Trading Terminal Ambient"
              fill
              className="object-cover"
            />
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-400">
                <Terminal className="w-3 h-3 text-blue-400" />
                <span>VIETNAM FINANCIAL TRADING TERMINAL 2026</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                Hệ Thống Phân Tích Kỹ Thuật & Radar Cổ Phiếu Thông Minh
              </h2>
              <p className="text-xs text-slate-400 max-w-2xl">
                Tích hợp dữ liệu thời gian thực sàn <strong>SSI iBoard (HOSE & HNX)</strong>, biểu đồ nến chuẩn Việt Nam, nhận diện mẫu nến AI & trợ lý quản trị danh mục vốn cho nhà đầu tư.
              </p>
            </div>

            {/* Quick Market Pulse */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Số mã theo dõi:</span>
                <strong className="text-white text-sm">{allStocks.length || 408} mã</strong>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Dữ liệu nguồn:</span>
                <strong className="text-emerald-400 text-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  HOSE / HNX
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Navigation (Segmented Pill Dock) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative z-10">
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800/90 w-fit shadow-xl">
          <button
            onClick={() => setActiveTab('RADAR')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'RADAR'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            🎯 Radar Đột Biến & Đầu Tư Hôm Nay
          </button>

          <button
            onClick={() => setActiveTab('SSIBOARD')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'SSIBOARD'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-300" />
            Bảng Giá Trực Tuyến SSI (VN-Index)
          </button>

          <button
            onClick={() => setActiveTab('NEWS_PORTFOLIO')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'NEWS_PORTFOLIO'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Newspaper className="w-4 h-4 text-emerald-300" />
            Tin Tức Kinh Tế & Danh Mục Cá Nhân
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 relative z-10">
        
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
                <span className="text-xs text-slate-400 font-mono">
                  Hiển thị {articles.length} bản tin mới nhất
                </span>
              </div>

              <NewsFeed articles={articles} isLoading={isLoading} />
            </section>

            <section className="lg:col-span-4 space-y-4">
              <div className="sticky top-20">
                <PortfolioTracker stocks={allStocks} profiles={profiles} />
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

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-slate-900 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">VNStock Terminal</span>
          <span>© 2026. Thiết kế chuyên sâu theo chuẩn phân tích tài chính Việt Nam.</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Dữ liệu: SSI iBoard & Sở GDCK</span>
          <span>● Hệ thống đang hoạt động</span>
        </div>
      </footer>
    </div>
  );
}
