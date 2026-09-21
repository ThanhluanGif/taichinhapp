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
  History,
  ChevronDown,
  ChevronUp,
  Calculator,
  Calendar,
  Layers,
} from 'lucide-react';

// Chi tiết từng phiên / đợt mua cổ phiếu
export interface BuySession {
  id: string;
  shares: number;        // Số lượng mua phiên này (CP)
  buyPrice: number;      // Giá mua phiên này (VNĐ)
  date: string;          // Ngày / Phiên mua (VD: 22/09/2026)
  note?: string;         // Ghi chú (VD: Mua mở vị thế, Mua gom thêm, v.v.)
}

export interface PortfolioStock {
  id: string;
  symbol: string;
  name: string;               // Tên doanh nghiệp đầy đủ
  orders: BuySession[];       // Danh sách các phiên mua
  shares: number;             // Tổng số lượng cổ phiếu đang có (tổng các phiên)
  buyPrice: number;           // Giá vốn trung bình (VNĐ - bình quân gia quyền)
  currentPrice: number;       // Giá hiện tại tự động cập nhật Realtime từ sàn (VNĐ)
  stopLossPercent?: number;   // % Cắt lỗ (Mặc định -7%)
  takeProfitPercent?: number; // % Chốt lãi (Mặc định +18%)
  lastUpdated?: string;       // Thời gian cập nhật giá
}

// Dữ liệu mẫu ban đầu minh họa rõ nét tính năng mua nhiều phiên tính giá trung bình
const INITIAL_PORTFOLIO: PortfolioStock[] = [
  {
    id: '1',
    symbol: 'FPT',
    name: 'Công ty Cổ phần FPT',
    shares: 1500,
    buyPrice: 124000,
    currentPrice: 135000,
    stopLossPercent: 7,
    takeProfitPercent: 18,
    orders: [
      {
        id: 'fpt-1',
        shares: 1000,
        buyPrice: 120000,
        date: '10/09/2026',
        note: 'Mua mở vị thế ban đầu',
      },
      {
        id: 'fpt-2',
        shares: 500,
        buyPrice: 132000,
        date: '18/09/2026',
        note: 'Mua gia tăng khi vượt đỉnh',
      },
    ],
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
    orders: [
      {
        id: 'hpg-1',
        shares: 1000,
        buyPrice: 29500,
        date: '05/09/2026',
        note: 'Mua gom lần 1',
      },
      {
        id: 'hpg-2',
        shares: 1000,
        buyPrice: 27500,
        date: '15/09/2026',
        note: 'Mua trung bình giá hạ giá vốn',
      },
    ],
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
    orders: [
      {
        id: 'vcb-1',
        shares: 500,
        buyPrice: 88000,
        date: '12/09/2026',
        note: 'Mua tích lũy dài hạn',
      },
    ],
  },
];

// Danh sách gợi ý nhanh các mã VN30 phổ biến
const POPULAR_SYMBOLS = ['FPT', 'HPG', 'VCB', 'SSI', 'VND', 'MWG', 'TCB', 'MBB', 'VHM', 'VIC'];

interface Props {
  stocks?: StockQuote[];
  profiles?: Record<string, CompanyProfile>;
}

// Hàm tính bình quân gia quyền giá vốn
export const computeWeightedAverage = (orders: BuySession[]) => {
  const totalShares = orders.reduce((sum, o) => sum + (Number(o.shares) || 0), 0);
  const totalCost = orders.reduce((sum, o) => sum + (Number(o.shares) || 0) * (Number(o.buyPrice) || 0), 0);
  const avgBuyPrice = totalShares > 0 ? Math.round(totalCost / totalShares) : 0;
  return { totalShares, totalCost, avgBuyPrice };
};

export const PortfolioTracker: React.FC<Props> = ({ stocks = [], profiles = {} }) => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Form states cho thêm mã mới
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [note, setNote] = useState('');
  const [stopLoss, setStopLoss] = useState('7');
  const [takeProfit, setTakeProfit] = useState('18');
  const [detectedStock, setDetectedStock] = useState<StockQuote | null>(null);

  // State quản lý xem lịch sử phiên mua & modal mua thêm từng mã
  const [expandedStockId, setExpandedStockId] = useState<string | null>(null);
  const [addingSessionStockId, setAddingSessionStockId] = useState<string | null>(null);
  const [newSessionShares, setNewSessionShares] = useState('');
  const [newSessionPrice, setNewSessionPrice] = useState('');
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toLocaleDateString('vi-VN'));
  const [newSessionNote, setNewSessionNote] = useState('');

  // 1. Tải danh mục từ LocalStorage khi khởi động (tự động migrate định dạng nếu có phiên bản cũ)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('personal_portfolio_v4');
      if (saved) {
        const parsed: PortfolioStock[] = JSON.parse(saved);
        // Kiểm tra và migrate đảm bảo có mảng orders
        const migrated = parsed.map((item) => {
          if (!item.orders || item.orders.length === 0) {
            const fallbackOrder: BuySession = {
              id: 'init-' + item.id,
              shares: item.shares || 1000,
              buyPrice: item.buyPrice || 100000,
              date: 'Phiên 1',
              note: 'Mua lần đầu',
            };
            return {
              ...item,
              orders: [fallbackOrder],
              shares: fallbackOrder.shares,
              buyPrice: fallbackOrder.buyPrice,
            };
          }
          // Tính lại giá bình quân chuẩn xác
          const { totalShares, avgBuyPrice } = computeWeightedAverage(item.orders);
          return {
            ...item,
            shares: totalShares,
            buyPrice: avgBuyPrice,
          };
        });
        setPortfolio(migrated);
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
        // ignore network error
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
      localStorage.setItem('personal_portfolio_v4', JSON.stringify(portfolio));
    }
  }, [portfolio, isLoaded]);

  // Tính toán chỉ số tài chính tổng hợp toàn danh mục
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

  // Xử lý khi người dùng chọn mã cổ phiếu ở form tổng
  const handleSelectSymbol = (sym: string) => {
    const clean = sym.toUpperCase().trim();
    setSymbol(clean);
    const { stockMatch, livePrice } = resolveStockInfo(clean);
    setDetectedStock(stockMatch || null);

    if (livePrice > 0 && !buyPrice) {
      setBuyPrice(livePrice.toString());
    }
  };

  // Thêm một mã mới hoặc cộng dồn phiên mua vào mã đã có
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    const cleanSymbol = symbol.toUpperCase().trim();
    const { companyName, livePrice } = resolveStockInfo(cleanSymbol);

    const inputShares = parseFloat(shares);
    const inputBuyPrice = parseFloat(buyPrice);
    const initialCurrentPrice = livePrice > 0 ? livePrice : inputBuyPrice;

    // Kiểm tra xem mã này đã có trong danh mục chưa
    const existingIndex = portfolio.findIndex((p) => p.symbol.toUpperCase() === cleanSymbol);

    const newOrder: BuySession = {
      id: Date.now().toString(),
      shares: inputShares,
      buyPrice: inputBuyPrice,
      date: buyDate || new Date().toLocaleDateString('vi-VN'),
      note: note || `Phiên mua ${existingIndex >= 0 ? portfolio[existingIndex].orders.length + 1 : 1}`,
    };

    if (existingIndex >= 0) {
      // Đã có mã: Cộng dồn phiên mua và tính lại giá vốn trung bình
      const existing = portfolio[existingIndex];
      const updatedOrders = [...existing.orders, newOrder];
      const { totalShares, avgBuyPrice } = computeWeightedAverage(updatedOrders);

      const updatedItem: PortfolioStock = {
        ...existing,
        name: companyName || existing.name,
        orders: updatedOrders,
        shares: totalShares,
        buyPrice: avgBuyPrice,
        currentPrice: existing.currentPrice > 0 ? existing.currentPrice : initialCurrentPrice,
        lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      const newPortfolio = [...portfolio];
      newPortfolio[existingIndex] = updatedItem;
      setPortfolio(newPortfolio);
    } else {
      // Mã mới hoàn toàn
      const newStock: PortfolioStock = {
        id: Date.now().toString(),
        symbol: cleanSymbol,
        name: companyName,
        orders: [newOrder],
        shares: inputShares,
        buyPrice: inputBuyPrice,
        currentPrice: initialCurrentPrice,
        stopLossPercent: parseFloat(stopLoss) || 7,
        takeProfitPercent: parseFloat(takeProfit) || 18,
        lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setPortfolio([newStock, ...portfolio]);
    }

    setSymbol('');
    setShares('');
    setBuyPrice('');
    setNote('');
    setDetectedStock(null);
    setShowAddForm(false);
  };

  // Thêm một phiên mua mới trực tiếp trên thẻ cổ phiếu cụ thể
  const handleAddSessionToStock = (stockId: string) => {
    if (!newSessionShares || !newSessionPrice) return;

    const stock = portfolio.find((s) => s.id === stockId);
    if (!stock) return;

    const newOrder: BuySession = {
      id: Date.now().toString(),
      shares: parseFloat(newSessionShares),
      buyPrice: parseFloat(newSessionPrice),
      date: newSessionDate || new Date().toLocaleDateString('vi-VN'),
      note: newSessionNote || `Phiên mua #${stock.orders.length + 1}`,
    };

    const updatedOrders = [...stock.orders, newOrder];
    const { totalShares, avgBuyPrice } = computeWeightedAverage(updatedOrders);

    const updatedPortfolio = portfolio.map((item) => {
      if (item.id === stockId) {
        return {
          ...item,
          orders: updatedOrders,
          shares: totalShares,
          buyPrice: avgBuyPrice,
          lastUpdated: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      }
      return item;
    });

    setPortfolio(updatedPortfolio);
    setAddingSessionStockId(null);
    setNewSessionShares('');
    setNewSessionPrice('');
    setNewSessionNote('');
  };

  // Xóa một phiên mua cụ thể trong lịch sử
  const handleDeleteSession = (stockId: string, orderId: string) => {
    const stock = portfolio.find((s) => s.id === stockId);
    if (!stock) return;

    const remainingOrders = stock.orders.filter((o) => o.id !== orderId);
    if (remainingOrders.length === 0) {
      // Nếu xóa hết phiên mua thì xóa cả mã
      setPortfolio(portfolio.filter((s) => s.id !== stockId));
      return;
    }

    const { totalShares, avgBuyPrice } = computeWeightedAverage(remainingOrders);

    const updatedPortfolio = portfolio.map((item) => {
      if (item.id === stockId) {
        return {
          ...item,
          orders: remainingOrders,
          shares: totalShares,
          buyPrice: avgBuyPrice,
        };
      }
      return item;
    });

    setPortfolio(updatedPortfolio);
  };

  // Xóa toàn bộ mã khỏi danh mục
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
      
      {/* 1. TOP HEADER & STATUS */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shadow-inner">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Danh Mục Cổ Phiếu (Giá Vốn TB)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Realtime Auto-Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hỗ trợ mua nhiều phiên (DCA) & Tự động cập nhật giá sàn
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
            <Plus className="w-3.5 h-3.5" /> Thêm mã mua
          </button>
        </div>
      </div>

      {/* 2. TỔNG QUAN VỐN & LÃI/LỖ */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Vốn Đầu Tư (Tất cả phiên)
          </span>
          <span className="text-sm font-bold text-slate-100 block font-mono">
            {formatVND(totalCost)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {portfolio.length} mã cổ phiếu đang nắm giữ
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

      {/* 3. FORM THÊM CỔ PHIẾU / PHIÊN MUA MỚI */}
      {showAddForm && (
        <form
          onSubmit={handleAddStock}
          className="p-4 bg-slate-950 rounded-xl border border-blue-500/40 shadow-xl space-y-3.5 transition-all"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-blue-400 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Thêm cổ phiếu / Phiên mua mới
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
              ✓ Tự động tính giá vốn trung bình (DCA)
            </span>
          </div>

          {/* Quick Select Chips */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1.5">Chọn nhanh mã VN30:</span>
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
                Mã cổ phiếu:
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

            {/* Input 2: Số lượng mua phiên này */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Số lượng mua phiên này (CP):
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

            {/* Input 3: Giá mua phiên này */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Giá mua phiên này (VNĐ):
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

            {/* Input 4: Ngày mua & Ghi chú */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">
                Ngày mua & Ghi chú phiên:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ngày mua (VD: 22/09)"
                  value={buyDate}
                  onChange={(e) => setBuyDate(e.target.value)}
                  className="w-1/2 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Ghi chú (VD: Lần 1, Mua gom...)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-1/2 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Thông báo thông minh nếu mã đã có trong danh mục */}
          {symbol && portfolio.some((p) => p.symbol.toUpperCase() === symbol.toUpperCase().trim()) && (
            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-[11px] text-indigo-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div>
                <strong>Mã {symbol.toUpperCase()} đã có trong danh mục!</strong> Phiên này sẽ được cộng dồn vào các phiên trước và tự động tính lại <strong>Giá vốn trung bình</strong> mới.
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
              Lưu phiên mua
            </button>
          </div>
        </form>
      )}

      {/* 4. DANH SÁCH CỔ PHIẾU VỚI GIÁ VỐN TRUNG BÌNH & CÁC PHIÊN MUA */}
      <div className="space-y-3">
        {portfolio.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl">
            <PieChart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">
              Chưa có mã cổ phiếu nào trong danh mục.
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Nhấn &quot;Thêm mã mua&quot; ở trên để bắt đầu theo dõi.
            </p>
          </div>
        ) : (
          portfolio.map((item) => {
            const costVal = item.shares * item.buyPrice;
            const currentVal = item.shares * item.currentPrice;
            const profitLoss = currentVal - costVal;
            const profitLossPercent = costVal > 0 ? (profitLoss / costVal) * 100 : 0;
            const isGain = profitLoss >= 0;

            // Tính điểm cắt lỗ & chốt lời theo GIÁ VỐN TRUNG BÌNH
            const slPercent = item.stopLossPercent || 7;
            const tpPercent = item.takeProfitPercent || 18;
            const stopLossPrice = Math.round(item.buyPrice * (1 - slPercent / 100));
            const takeProfitPrice = Math.round(item.buyPrice * (1 + tpPercent / 100));

            const isStopLossTriggered = item.currentPrice <= stopLossPrice;
            const isTakeProfitTriggered = item.currentPrice >= takeProfitPrice;

            const isExpanded = expandedStockId === item.id;
            const isAddingSession = addingSessionStockId === item.id;

            // Preview giá trung bình mới khi đang nhập thêm phiên
            const previewNewAvg = (() => {
              if (!newSessionShares || !newSessionPrice || !isAddingSession) return null;
              const addShares = parseFloat(newSessionShares) || 0;
              const addPrice = parseFloat(newSessionPrice) || 0;
              if (addShares <= 0 || addPrice <= 0) return null;
              const newTotalShares = item.shares + addShares;
              const newTotalCost = costVal + addShares * addPrice;
              return Math.round(newTotalCost / newTotalShares);
            })();

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
                {/* Dòng 1: Mã CP, Tên Doanh Nghiệp, Số lượng tổng & Lãi/Lỗ */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white tracking-wider font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                        {item.symbol}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                        Tổng: {item.shares.toLocaleString('vi-VN')} CP
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.orders.length} phiên mua
                      </span>
                    </div>
                    {/* Tên đầy đủ doanh nghiệp */}
                    <div className="text-xs font-semibold text-slate-300 mt-1 truncate" title={item.name}>
                      {item.name}
                    </div>
                  </div>

                  {/* Lãi / Lỗ Realtime tính theo Giá vốn trung bình */}
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

                {/* Hộp so sánh: GIÁ VỐN TRUNG BÌNH vs GIÁ SÀN REALTIME */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 mb-2.5">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-medium">
                      <Calculator className="w-3 h-3 text-indigo-400" />
                      <span>Giá vốn trung bình:</span>
                    </div>
                    <div className="font-bold text-slate-100 font-mono text-xs mt-0.5">
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
                    <div className={`font-bold font-mono text-xs mt-0.5 ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
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

                {/* Kế hoạch Cắt Lỗ (-7%) & Chốt Lãi (+18%) theo Giá TB */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Cắt lỗ (từ Giá TB):
                    </span>
                    <strong className="text-rose-400 font-mono">
                      {formatVND(stopLossPrice)} (-{slPercent}%)
                    </strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <Target className="w-3 h-3 text-emerald-400" />
                      Chốt lời (từ Giá TB):
                    </span>
                    <strong className="text-emerald-400 font-mono">
                      {formatVND(takeProfitPrice)} (+{tpPercent}%)
                    </strong>
                  </div>

                  {/* Thanh nút công cụ: + Mua thêm phiên mới | Xem lịch sử các phiên | Xóa */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setAddingSessionStockId(isAddingSession ? null : item.id);
                          setNewSessionShares('');
                          setNewSessionPrice(item.currentPrice > 0 ? item.currentPrice.toString() : '');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-[10px] font-bold transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Mua thêm phiên
                      </button>

                      <button
                        onClick={() => setExpandedStockId(isExpanded ? null : item.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] transition-colors"
                      >
                        <History className="w-3 h-3 text-slate-400" />
                        Lịch sử ({item.orders.length})
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isStopLossTriggered ? (
                        <span className="text-rose-400 font-bold text-[10px] animate-pulse">
                          🚨 Cắt lỗ ngay!
                        </span>
                      ) : isTakeProfitTriggered ? (
                        <span className="text-emerald-300 font-bold text-[10px]">
                          🎯 Chốt lời!
                        </span>
                      ) : null}

                      <button
                        onClick={() => handleDeleteStock(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors rounded hover:bg-slate-800"
                        title="Xóa toàn bộ mã này khỏi danh mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* FORM NHẬP THÊM PHIÊN MUA MỚI CHO RIÊNG MÃ NÀY */}
                {isAddingSession && (
                  <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-blue-500/30 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px] font-bold text-blue-400">
                      <span>+ Mua thêm cổ phiếu {item.symbol}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Tự tính lại giá vốn trung bình</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Số lượng mua thêm:</label>
                        <input
                          type="number"
                          placeholder="VD: 500"
                          value={newSessionShares}
                          onChange={(e) => setNewSessionShares(e.target.value)}
                          className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <label className="text-[10px] text-slate-400">Giá mua phiên này:</label>
                          {item.currentPrice > 0 && (
                            <button
                              type="button"
                              onClick={() => setNewSessionPrice(item.currentPrice.toString())}
                              className="text-[9px] text-blue-400 hover:underline"
                            >
                              Lấy giá sàn
                            </button>
                          )}
                        </div>
                        <input
                          type="number"
                          placeholder="VD: 132000"
                          value={newSessionPrice}
                          onChange={(e) => setNewSessionPrice(e.target.value)}
                          className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Ngày mua:</label>
                        <input
                          type="text"
                          value={newSessionDate}
                          onChange={(e) => setNewSessionDate(e.target.value)}
                          className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Ghi chú:</label>
                        <input
                          type="text"
                          placeholder="VD: Mua gia tăng, Mua gom..."
                          value={newSessionNote}
                          onChange={(e) => setNewSessionNote(e.target.value)}
                          className="w-full p-2 rounded bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Preview kết quả giá vốn trung bình sau khi mua */}
                    {previewNewAvg && (
                      <div className="p-2 rounded bg-indigo-950/30 border border-indigo-500/20 text-[10px] text-indigo-300 flex items-center justify-between">
                        <span>Giá vốn TB dự kiến sau mua:</span>
                        <strong className="text-white font-mono">
                          {formatVND(previewNewAvg)} (tổng {(item.shares + (parseFloat(newSessionShares) || 0)).toLocaleString()} CP)
                        </strong>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAddingSessionStockId(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[10px]"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSessionToStock(item.id)}
                        className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-500"
                      >
                        Xác nhận mua thêm
                      </button>
                    </div>
                  </div>
                )}

                {/* BẢNG CHI TIẾT CÁC PHIÊN MUA (EXPANDED) */}
                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                      <span className="flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-blue-400" />
                        Lịch sử {item.orders.length} phiên mua:
                      </span>
                      <span className="text-[10px] text-slate-500">Bình quân gia quyền</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {item.orders.map((order, idx) => (
                        <div
                          key={order.id}
                          className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[10px]"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-400">#{idx + 1}</span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-slate-500" /> {order.date}
                              </span>
                              {order.note && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {order.note}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-slate-300">
                              {order.shares.toLocaleString()} CP @ {formatVND(order.buyPrice)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-200">
                              {formatVND(order.shares * order.buyPrice)}
                            </span>
                            {item.orders.length > 1 && (
                              <button
                                onClick={() => handleDeleteSession(item.id, order.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                                title="Xóa phiên mua này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
