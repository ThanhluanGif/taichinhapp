'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StockQuote, CompanyProfile } from '@/types/stock';
import { getBasePath } from '@/utils/path';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PieChart,
  ShieldAlert,
  Target,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Building2,
  Check,
} from 'lucide-react';

export interface PortfolioStock {
  id: string;
  symbol: string;
  name: string;            // Tên doanh nghiệp đầy đủ
  shares: number;          // Số lượng cổ phiếu đang có
  buyPrice: number;        // Giá vốn khi mua (VNĐ - người dùng tự nhập)
  currentPrice: number;    // Giá hiện tại tự động cập nhật Realtime từ sàn (VNĐ)
  stopLossPercent?: number;   // % Cắt lỗ (Mặc định -7%)
  takeProfitPercent?: number; // % Chốt lãi (Mặc định +18%)
  lastUpdated?: string;    // Thời gian cập nhật giá
}

const INITIAL_PORTFOLIO: PortfolioStock[] = [
  {
    id: '1',
    symbol: 'FPT',
    name: 'Công ty Cổ phần FPT',
    shares: 1000,
    buyPrice: 125000,
    currentPrice: 135000,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
  {
    id: '2',
    symbol: 'HPG',
    name: 'Công ty Cổ phần Tập đoàn Hòa Phát',
    shares: 2000,
    buyPrice: 28500,
    currentPrice: 26800,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
  {
    id: '3',
    symbol: 'VCB',
    name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
    shares: 500,
    buyPrice: 88000,
    currentPrice: 92500,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
];

// Danh sách gợi ý nhanh các mã VN30 phổ biến
const POPULAR_SYMBOLS = ['FPT', 'HPG', 'VCB', 'SSI', 'VND', 'MWG', 'TCB', 'MBB', 'VHM', 'VIC'];

interface Props {
  stocks?: StockQuote[];
  profiles?: Record<string, CompanyProfile>;
}

export const PortfolioTracker: React.FC<Props> = ({ stocks = [], profiles = {} }) => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('7');
  const [takeProfit, setTakeProfit] = useState('18');
  const [detectedStock, setDetectedStock] = useState<StockQuote | null>(null);

  // 1. Tải danh mục từ LocalStorage khi khởi động
  useEffect(() => {
    try {
      const saved = localStorage.getItem('personal_portfolio_v3');
      if (saved) {
        setPortfolio(JSON.parse(saved));
      } else {
        setPortfolio(INITIAL_PORTFOLIO);
      }
    } catch {
      setPortfolio(INITIAL_PORTFOLIO);
    }
    setIsLoaded(true);
  }, []);

  // Hàm tra cứu tên công ty và giá realtime của một mã
  const resolveStockInfo = useCallback((sym: string) => {
    const cleanSym = sym.toUpperCase().trim();
    const stockMatch = stocks.find((s) => s.symbol.toUpperCase() === cleanSym);
    const profileMatch = profiles[cleanSym];

    const companyName =
      profileMatch?.nameVi ||
      stockMatch?.name ||
      `Công ty Cổ phần ${cleanSym}`;

    const livePrice = stockMatch?.matchedPrice && stockMatch.matchedPrice > 0
      ? stockMatch.matchedPrice
      : 0;

    return { stockMatch, companyName, livePrice };
  }, [stocks, profiles]);

  // 2. TỰ ĐỘNG CẬP NHẬT REALTIME GIÁ HIỆN TẠI TỪ DỮ LIỆU SÀN CHỨNG KHOÁN
  const syncPricesWithMarket = useCallback((targetPortfolio: PortfolioStock[], stockList: StockQuote[]) => {
    if (stockList.length === 0 || targetPortfolio.length === 0) return targetPortfolio;

    let hasChanges = false;
    const updated = targetPortfolio.map((item) => {
      const cleanSym = item.symbol.toUpperCase().trim();
      const liveStock = stockList.find((s) => s.symbol.toUpperCase() === cleanSym);
      const profile = profiles[cleanSym];

      const resolvedName = profile?.nameVi || liveStock?.name || item.name;

      if (liveStock && liveStock.matchedPrice > 0 && liveStock.matchedPrice !== item.currentPrice) {
        hasChanges = true;
        return {
          ...item,
          name: resolvedName,
          currentPrice: liveStock.matchedPrice,
          lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      } else if (resolvedName && resolvedName !== item.name) {
        hasChanges = true;
        return {
          ...item,
          name: resolvedName,
        };
      }
      return item;
    });

    if (hasChanges) {
      setLastSyncTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    return hasChanges ? updated : targetPortfolio;
  }, [profiles]);

  // Tự động đồng bộ khi `stocks` thay đổi từ props
  useEffect(() => {
    if (!isLoaded || stocks.length === 0 || portfolio.length === 0) return;
    const updated = syncPricesWithMarket(portfolio, stocks);
    if (updated !== portfolio) {
      setPortfolio(updated);
    }
  }, [stocks, isLoaded, syncPricesWithMarket, portfolio]);

  // Tự động polling làm mới giá định kỳ mỗi 20 giây từ server
  useEffect(() => {
    if (!isLoaded) return;

    const intervalId = setInterval(async () => {
      try {
        const basePath = getBasePath();
        const res = await fetch(`${basePath}/data/stocks.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const freshStocks: StockQuote[] = data?.all || [];
          if (freshStocks.length > 0) {
            setPortfolio((prev) => syncPricesWithMarket(prev, freshStocks));
          }
        }
      } catch {
        // bỏ qua lỗi mạng tạm thời
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [isLoaded, syncPricesWithMarket]);

  // Nút thủ công: Làm mới giá sàn ngay lập tức
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const basePath = getBasePath();
      const res = await fetch(`${basePath}/data/stocks.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const freshStocks: StockQuote[] = data?.all || [];
        if (freshStocks.length > 0) {
          setPortfolio((prev) => syncPricesWithMarket(prev, freshStocks));
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsSyncing(false), 400);
    }
  };

  // Lưu vào LocalStorage khi danh mục thay đổi
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('personal_portfolio_v3', JSON.stringify(portfolio));
    }
  }, [portfolio, isLoaded]);

  // Tính toán chỉ số tài chính tổng hợp
  const totalCost = useMemo(
    () => portfolio.reduce((acc, item) => acc + item.shares * item.buyPrice, 0),
    [portfolio]
  );
  const totalCurrentValue = useMemo(
    () => portfolio.reduce((acc, item) => acc + item.shares * item.currentPrice, 0),
    [portfolio]
  );
  const totalProfitLoss = totalCurrentValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  // Xử lý khi người dùng nhập hoặc chọn mã cổ phiếu
  const handleSelectSymbol = (sym: string) => {
    const clean = sym.toUpperCase().trim();
    setSymbol(clean);
    const { stockMatch, livePrice } = resolveStockInfo(clean);
    setDetectedStock(stockMatch || null);

    // Nếu người dùng chưa gõ giá mua, có thể gợi ý giá hiện tại
    if (livePrice > 0 && !buyPrice) {
      setBuyPrice(livePrice.toString());
    }
  };

  // Xử lý thêm cổ phiếu vào sổ lệnh
  // Lưu ý quan trọng: Người dùng CHỈ nhập Số lượng và Giá vốn mua.
  // Giá hiện tại sẽ TỰ ĐỘNG lấy từ sàn và TỰ ĐỘNG cập nhật liên tục!
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    const cleanSymbol = symbol.toUpperCase().trim();
    const { companyName, livePrice } = resolveStockInfo(cleanSymbol);

    const inputBuyPrice = parseFloat(buyPrice);
    // Giá hiện tại tự động lấy từ sàn, nếu chưa có thì lấy tạm giá mua và sẽ tự cập nhật khi có data
    const initialCurrentPrice = livePrice > 0 ? livePrice : inputBuyPrice;

    const newStock: PortfolioStock = {
      id: Date.now().toString(),
      symbol: cleanSymbol,
      name: companyName,
      shares: parseFloat(shares),
      buyPrice: inputBuyPrice,
      currentPrice: initialCurrentPrice,
      stopLossPercent: parseFloat(stopLoss) || 7,
      takeProfitPercent: parseFloat(takeProfit) || 18,
      lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setPortfolio([newStock, ...portfolio]);
    setSymbol('');
    setShares('');
    setBuyPrice('');
    setDetectedStock(null);
    setShowAddForm(false);
  };

  const handleDeleteStock = (id: string) => {
    setPortfolio(portfolio.filter((item) => item.id !== id));
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatBoardPrice = (val: number) => (val / 1000).toFixed(2);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-4 sm:p-5 space-y-4 text-xs font-sans">
      
      {/* 1. TOP HEADER & REALTIME STATUS */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shadow-inner">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Danh Mục Cổ Phiếu Đang Giữ
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Realtime Auto-Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Giá hiện tại tự động cập nhật từ sàn SSI & VN-Index
              {lastSyncTime && <span className="text-slate-500 ml-1">({lastSyncTime})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
            title="Đồng bộ giá sàn ngay lập tức"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/30"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm mã
          </button>
        </div>
      </div>

      {/* 2. TỔNG QUAN TÀI CHÍNH TỔNG VỐN & LÃI/LỖ */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Vốn Đầu Tư (Giá mua)
          </span>
          <span className="text-sm font-bold text-slate-100 block font-mono">
            {formatVND(totalCost)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {portfolio.length} mã trong sổ lệnh
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Lãi / Lỗ Realtime
          </span>
          <div className="flex items-center gap-1">
            {totalProfitLoss >= 0 ? (
              <span className="text-sm font-bold text-emerald-400 flex items-center font-mono">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                +{formatVND(totalProfitLoss)}
              </span>
            ) : (
              <span className="text-sm font-bold text-rose-400 flex items-center font-mono">
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
                {formatVND(totalProfitLoss)}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold font-mono mt-0.5 block ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}% tổng danh mục
          </span>
        </div>
      </div>

      {/* 3. FORM THÊM CỔ PHIẾU VÀO DANH MỤC */}
      {showAddForm && (
        <form
          onSubmit={handleAddStock}
          className="p-4 bg-slate-950 rounded-xl border border-blue-500/40 shadow-xl space-y-3.5 transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Thêm cổ phiếu vào danh mục
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
              ✓ Giá hiện tại sẽ tự động cập nhật
            </span>
          </div>

          {/* Quick Select Chips */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1.5">Chọn nhanh mã VN30 tiêu biểu:</span>
            <div className="flex flex-wrap gap-1">
              {POPULAR_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelectSymbol(sym)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    symbol === sym
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input 1: Mã cổ phiếu */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Mã cổ phiếu (3 chữ cái):
              </label>
              <input
                type="text"
                placeholder="VD: FPT, HPG, SSI..."
                value={symbol}
                onChange={(e) => handleSelectSymbol(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-blue-500 focus:outline-none uppercase"
                required
              />
            </div>

            {/* Input 2: Số lượng đang có */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Số lượng đang có (cổ phiếu):
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="VD: 1000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Input 3: Giá vốn khi mua */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Giá vốn khi mua (VNĐ):
                </label>
                {detectedStock && detectedStock.matchedPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => setBuyPrice(detectedStock.matchedPrice.toString())}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    Lấy giá sàn ({formatVND(detectedStock.matchedPrice)})
                  </button>
                )}
              </div>
              <input
                type="number"
                min="100"
                step="100"
                placeholder="VD: 125000"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Input 4: Cắt lỗ & Chốt lãi (%) */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Mục tiêu Cắt lỗ / Chốt lãi (%):
              </label>
              <div className="flex gap-2">
                <div className="relative w-1/2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    title="% Cắt lỗ"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-rose-900/60 text-rose-400 font-mono font-bold text-center focus:outline-none"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-rose-500">-% SL</span>
                </div>
                <div className="relative w-1/2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    title="% Chốt lãi"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-emerald-900/60 text-emerald-400 font-mono font-bold text-center focus:outline-none"
                  />
                  <span className="absolute right-2 top-2.5 text-[10px] text-emerald-500">+% TP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin tra cứu tự động */}
          {symbol && (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-white">{resolveStockInfo(symbol).companyName}</span>
                  <span className="text-slate-400 block text-[10px]">Doanh nghiệp niêm yết</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Giá sàn Realtime:</span>
                <span className="font-bold text-emerald-400 font-mono text-xs">
                  {detectedStock && detectedStock.matchedPrice > 0
                    ? `${formatVND(detectedStock.matchedPrice)} (${formatBoardPrice(detectedStock.matchedPrice)})`
                    : 'Đang cập nhật...'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setDetectedStock(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-md transition-colors"
            >
              Lưu vào danh mục
            </button>
          </div>
        </form>
      )}

      {/* 4. DANH SÁCH CÁC MÃ CỔ PHIẾU ĐANG CÓ TRONG SỔ LỆNH */}
      <div className="space-y-3">
        {portfolio.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl">
            <PieChart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">
              Chưa có mã cổ phiếu nào trong danh mục.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Nhấn &quot;Thêm mã&quot; ở trên để nhập số lượng và giá vốn ban đầu.
            </p>
          </div>
        ) : (
          portfolio.map((item) => {
            const costVal = item.shares * item.buyPrice;
            const currentVal = item.shares * item.currentPrice;
            const profitLoss = currentVal - costVal;
            const profitLossPercent = costVal > 0 ? (profitLoss / costVal) * 100 : 0;
            const isGain = profitLoss >= 0;

            // Tính điểm cắt lỗ & chốt lời theo giá vốn mua
            const slPercent = item.stopLossPercent || 7;
            const tpPercent = item.takeProfitPercent || 18;
            const stopLossPrice = item.buyPrice * (1 - slPercent / 100);
            const takeProfitPrice = item.buyPrice * (1 + tpPercent / 100);

            // Kiểm tra trạng thái cắt lỗ / chốt lãi
            const isStopLossTriggered = item.currentPrice <= stopLossPrice;
            const isTakeProfitTriggered = item.currentPrice >= takeProfitPrice;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${
                  isStopLossTriggered
                    ? 'bg-rose-950/25 border-rose-600/60 shadow-lg shadow-rose-950/40'
                    : isTakeProfitTriggered
                    ? 'bg-emerald-950/25 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header dòng 1: Mã CP, Tên Doanh Nghiệp & Lãi/Lỗ */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white tracking-wider font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {item.symbol}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                        {item.shares.toLocaleString('vi-VN')} CP
                      </span>
                    </div>
                    {/* Tên đầy đủ của doanh nghiệp */}
                    <div className="text-xs font-semibold text-slate-300 mt-1 truncate" title={item.name}>
                      {item.name}
                    </div>
                  </div>

                  {/* Lãi / Lỗ Realtime */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-xs font-mono">
                      {isGain ? (
                        <span className="text-emerald-400 flex items-center justify-end">
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{profitLossPercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center justify-end">
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" />{profitLossPercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-bold font-mono ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isGain ? '+' : ''}{formatVND(profitLoss)}
                    </div>
                  </div>
                </div>

                {/* Hộp so sánh: Giá Vốn Khi Mua vs Giá Hiện Tại (Realtime) */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 mb-2.5">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Giá vốn khi mua:
                    </span>
                    <div className="font-bold text-slate-200 font-mono text-xs">
                      {formatVND(item.buyPrice)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Bảng điện: {formatBoardPrice(item.buyPrice)}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Giá hiện tại (Realtime):</span>
                    </div>
                    <div className={`font-bold font-mono text-xs ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatVND(item.currentPrice)}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Bảng điện: {formatBoardPrice(item.currentPrice)}
                    </span>
                  </div>
                </div>

                {/* Tổng tiền vốn vs Tổng tiền hiện tại */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mb-2 font-mono">
                  <span>Tổng vốn: {formatVND(costVal)}</span>
                  <span>Hiện tại: <strong className="text-slate-200">{formatVND(currentVal)}</strong></span>
                </div>

                {/* Kế hoạch Cắt Lỗ (-7%) & Chốt Lãi (+18%) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Điểm cắt lỗ:
                    </span>
                    <strong className="text-rose-400 font-mono">
                      {formatVND(stopLossPrice)} (-{slPercent}%)
                    </strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <Target className="w-3 h-3 text-emerald-400" />
                      Điểm chốt lời:
                    </span>
                    <strong className="text-emerald-400 font-mono">
                      {formatVND(takeProfitPrice)} (+{tpPercent}%)
                    </strong>
                  </div>

                  {/* Khuyến nghị hành động trực quan */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {isStopLossTriggered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px] animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        🚨 Cắt lỗ ngay để bảo toàn vốn!
                      </span>
                    ) : isTakeProfitTriggered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        🎯 Đạt mục tiêu: Chốt lời từng phần!
                      </span>
                    ) : isGain ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[10px]">
                        <Check className="w-3 h-3" />
                        Đang có lãi - Tiếp tục nắm giữ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                        Vùng an toàn - Tiếp tục quan sát
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteStock(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors rounded hover:bg-slate-800"
                      title="Xóa mã này khỏi danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
