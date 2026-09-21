'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StockQuote, SectorKey, StocksDataPayload, MarketIndex } from '@/types/stock';
import { NewsArticle } from '@/types';
import { getBasePath } from '@/utils/path';
import { StockDetailModal } from './StockDetailModal';
import { MarketIndicesBar } from './MarketIndicesBar';
import {
  Search,
  Star,
  RefreshCw,
  LineChart,
} from 'lucide-react';

interface Props {
  initialData?: StocksDataPayload;
  articles?: NewsArticle[];
}

const SECTOR_TABS: { key: SectorKey; label: string; icon: string }[] = [
  { key: 'VN30', label: 'VN30 Index', icon: '🏛️' },
  { key: 'WATCHLIST', label: 'Danh Mục Theo Dõi', icon: '⭐️' },
  { key: 'NGAN_HANG', label: 'Ngân Hàng', icon: '🏦' },
  { key: 'CHUNG_KHOAN', label: 'Chứng Khoán', icon: '📈' },
  { key: 'BAT_DONG_SAN', label: 'Bất Động Sản', icon: '🏢' },
  { key: 'THEP_VAT_LIEU', label: 'Thép & VLXD', icon: '🏗️' },
  { key: 'CONG_NGHE_BAN_LE', label: 'Công Nghệ - Bán Lẻ', icon: '💻' },
  { key: 'DAU_KHI_NANG_LUONG', label: 'Dầu Khí - Năng Lượng', icon: '⚡' },
  { key: 'HOSE', label: 'Tất Cả VN-Index', icon: '🇻🇳' },
];

export const SSIBoard: React.FC<Props> = ({ initialData, articles = [] }) => {
  const [data, setData] = useState<StocksDataPayload | null>(initialData || null);
  const [activeSector, setActiveSector] = useState<SectorKey>('VN30');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>(['FPT', 'HPG', 'SSI', 'VCB', 'VND', 'MWG']);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  // Load watchlist from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_stock_watchlist');
      if (saved) {
        setWatchlist(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveWatchlist = (newList: string[]) => {
    setWatchlist(newList);
    localStorage.setItem('user_stock_watchlist', JSON.stringify(newList));
  };

  const toggleWatchlist = (symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (watchlist.includes(symbol)) {
      saveWatchlist(watchlist.filter((s) => s !== symbol));
    } else {
      saveWatchlist([...watchlist, symbol]);
    }
  };

  // Fetch stocks & indices data
  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      const basePath = getBasePath();
      const res = await fetch(`${basePath}/data/stocks.json?t=` + Date.now());
      if (res.ok) {
        const json: StocksDataPayload = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date().toLocaleTimeString('vi-VN'));
    }
  };

  useEffect(() => {
    fetchStockData();
    const interval = setInterval(fetchStockData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter stocks based on active tab & search
  const displayedStocks = useMemo(() => {
    if (!data) return [];

    let list: StockQuote[] = [];

    if (activeSector === 'VN30') {
      list = data.vn30 || [];
    } else if (activeSector === 'HOSE') {
      list = data.all || [];
    } else if (activeSector === 'WATCHLIST') {
      list = (data.all || []).filter((s) => watchlist.includes(s.symbol));
    } else {
      const symbolsInSector = (data.sectors && data.sectors[activeSector]) || [];
      list = (data.all || []).filter((s) => symbolsInSector.includes(s.symbol));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toUpperCase().trim();
      list = (data.all || []).filter(
        (s) =>
          s.symbol.includes(query) || (s.name && s.name.toUpperCase().includes(query))
      );
    }

    return list;
  }, [data, activeSector, searchQuery, watchlist]);

  // Color helper functions following Vietnam Stock Board rules
  const getPriceColor = (price: number, ref: number, ceil: number, flr: number) => {
    if (price === 0) return 'text-amber-400';
    if (price >= ceil) return 'text-purple-400 font-bold'; // Trần (Tím)
    if (price <= flr) return 'text-cyan-400 font-bold';   // Sàn (Xanh lơ)
    if (price > ref) return 'text-emerald-400 font-bold';  // Tăng (Xanh lá)
    if (price < ref) return 'text-rose-500 font-bold';     // Giảm (Đỏ)
    return 'text-amber-400 font-bold';                     // Tham chiếu (Vàng)
  };

  const formatPrice = (val: number) => {
    if (!val) return '-';
    return (val / 1000).toFixed(2);
  };

  const formatVol = (val: number) => {
    if (!val) return '-';
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toLocaleString();
  };

  return (
    <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
      
      {/* 1. Market Indices Ticker Bar (VN-INDEX, VN30, HNX, UPCOM) */}
      {data?.indices && <MarketIndicesBar indices={data.indices} />}

      {/* 2. Top Header Bar */}
      <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/30">
            SSI
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Bảng Giá Điện Tử VN-Index & VN30
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                ● Live Streaming
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Nhấp vào mã bất kỳ để mở <strong>Biểu đồ nến kỹ thuật</strong> & <strong>Đánh giá doanh nghiệp</strong>
            </p>
          </div>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã (FPT, HPG, VCB...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={fetchStockData}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            title="Làm mới bảng giá"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* 3. Sector Category Tabs */}
      <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
        {SECTOR_TABS.map((tab) => {
          const isActive = activeSector === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSector(tab.key);
                setSearchQuery('');
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Main Stock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-slate-900/90 text-[11px] text-slate-400 border-b border-slate-800 select-none">
              <th className="py-2.5 px-3 text-center w-8">★</th>
              <th className="py-2.5 px-3 font-semibold text-slate-300">Mã CK</th>
              <th className="py-2.5 px-2 text-right text-purple-400 font-semibold" title="Giá Trần">Trần</th>
              <th className="py-2.5 px-2 text-right text-cyan-400 font-semibold" title="Giá Sàn">Sàn</th>
              <th className="py-2.5 px-2 text-right text-amber-400 font-semibold" title="Tham Chiếu">TC</th>
              
              {/* Bên Mua */}
              <th className="py-2.5 px-2 text-right text-slate-400 bg-slate-900/40" title="Giá Mua 1">Giá Mua</th>
              <th className="py-2.5 px-2 text-right text-slate-400 bg-slate-900/40" title="Khối Lượng Mua 1">KL Mua</th>

              {/* Khớp Lệnh */}
              <th className="py-2.5 px-2 text-right text-white font-bold bg-slate-800/70" title="Giá Khớp Lệnh">Khớp Lệnh</th>
              <th className="py-2.5 px-2 text-right text-white font-bold bg-slate-800/70" title="Tăng/Giảm">+/-</th>
              <th className="py-2.5 px-2 text-right text-white font-bold bg-slate-800/70" title="% Thay Đổi">%</th>
              <th className="py-2.5 px-2 text-right text-white font-bold bg-slate-800/70" title="Khối Lượng Khớp">KL Khớp</th>

              {/* Bên Bán */}
              <th className="py-2.5 px-2 text-right text-slate-400 bg-slate-900/40" title="Giá Bán 1">Giá Bán</th>
              <th className="py-2.5 px-2 text-right text-slate-400 bg-slate-900/40" title="Khối Lượng Bán 1">KL Bán</th>

              {/* Thống kê phiên */}
              <th className="py-2.5 px-3 text-right text-slate-300 font-semibold">Tổng KL</th>
              <th className="py-2.5 px-2 text-right text-slate-400">Cao</th>
              <th className="py-2.5 px-2 text-right text-slate-400">Thấp</th>
              <th className="py-2.5 px-3 text-center text-blue-400">Xem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {displayedStocks.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-12 text-center text-slate-500">
                  {isLoading ? 'Đang tải bảng giá SSI iBoard...' : 'Không tìm thấy mã cổ phiếu nào'}
                </td>
              </tr>
            ) : (
              displayedStocks.map((stock) => {
                const isStarred = watchlist.includes(stock.symbol);
                const matchedColor = getPriceColor(
                  stock.matchedPrice,
                  stock.refPrice,
                  stock.ceiling,
                  stock.floor
                );
                const isGain = stock.priceChange > 0;

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className="hover:bg-slate-800/60 transition-colors group cursor-pointer"
                  >
                    {/* Star / Watchlist */}
                    <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleWatchlist(stock.symbol, e)}
                        className={`transition-colors ${
                          isStarred
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={isStarred ? 'Bỏ theo dõi' : 'Thêm vào danh mục theo dõi'}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </td>

                    {/* Stock Symbol */}
                    <td className="py-2 px-3 font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{stock.symbol}</span>
                        <span className="text-[10px] text-slate-500 font-sans hidden sm:inline truncate max-w-[120px]" title={stock.name}>
                          {stock.name}
                        </span>
                      </div>
                    </td>

                    {/* Ceiling (Trần) */}
                    <td className="py-2 px-2 text-right text-purple-400 font-bold">
                      {formatPrice(stock.ceiling)}
                    </td>

                    {/* Floor (Sàn) */}
                    <td className="py-2 px-2 text-right text-cyan-400 font-bold">
                      {formatPrice(stock.floor)}
                    </td>

                    {/* Reference (TC) */}
                    <td className="py-2 px-2 text-right text-amber-400 font-bold">
                      {formatPrice(stock.refPrice)}
                    </td>

                    {/* Bid 1 (Mua 1) */}
                    <td
                      className={`py-2 px-2 text-right bg-slate-900/30 ${getPriceColor(
                        stock.best1Bid,
                        stock.refPrice,
                        stock.ceiling,
                        stock.floor
                      )}`}
                    >
                      {formatPrice(stock.best1Bid)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300 bg-slate-900/30">
                      {formatVol(stock.best1BidVol)}
                    </td>

                    {/* Matched (Khớp lệnh) */}
                    <td className={`py-2 px-2 text-right font-bold bg-slate-800/40 ${matchedColor}`}>
                      {formatPrice(stock.matchedPrice)}
                    </td>
                    <td className={`py-2 px-2 text-right font-bold bg-slate-800/40 ${matchedColor}`}>
                      {isGain ? '+' : ''}
                      {stock.priceChange ? (stock.priceChange / 1000).toFixed(2) : '0.00'}
                    </td>
                    <td className={`py-2 px-2 text-right font-bold bg-slate-800/40 ${matchedColor}`}>
                      {isGain ? '+' : ''}
                      {stock.priceChangePercent ? stock.priceChangePercent.toFixed(2) + '%' : '0.0%'}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300 bg-slate-800/40">
                      {formatVol(stock.matchedVolume)}
                    </td>

                    {/* Offer 1 (Bán 1) */}
                    <td
                      className={`py-2 px-2 text-right bg-slate-900/30 ${getPriceColor(
                        stock.best1Offer,
                        stock.refPrice,
                        stock.ceiling,
                        stock.floor
                      )}`}
                    >
                      {formatPrice(stock.best1Offer)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300 bg-slate-900/30">
                      {formatVol(stock.best1OfferVol)}
                    </td>

                    {/* Total Volume */}
                    <td className="py-2 px-3 text-right font-semibold text-slate-200">
                      {formatVol(stock.totalVolume)}
                    </td>

                    {/* High / Low */}
                    <td className="py-2 px-2 text-right text-emerald-400">
                      {formatPrice(stock.highest)}
                    </td>
                    <td className="py-2 px-2 text-right text-rose-400">
                      {formatPrice(stock.lowest)}
                    </td>

                    {/* View Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStock(stock);
                        }}
                        className="p-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[11px] font-sans flex items-center gap-1 mx-auto"
                        title="Xem biểu đồ & chỉ số"
                      >
                        <LineChart className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Đánh giá</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      <div className="bg-slate-900/80 px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> Trần
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Sàn
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Tham chiếu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Tăng
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Giảm
          </span>
        </div>

        <div>
          Tổng hiển thị: <strong className="text-white">{displayedStocks.length}</strong> mã cổ phiếu (Nhấp mã để xem biểu đồ nến & chỉ số)
        </div>
      </div>

      {/* 5. Stock Detail Modal (TradingView Candlestick + Financial Metrics) */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
        articles={articles}
      />
    </div>
  );
};
