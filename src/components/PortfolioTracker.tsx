'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StockQuote } from '@/types/stock';
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
} from 'lucide-react';

export interface PortfolioStock {
  id: string;
  symbol: string;
  name?: string;
  shares: number;
  buyPrice: number;       // Giá vốn ban đầu người dùng tự nhập (VND)
  currentPrice: number;   // Giá hiện tại tự động cập nhật Realtime từ sàn (VND)
  stopLossPercent?: number; // % Cắt lỗ (Mặc định -7%)
  takeProfitPercent?: number; // % Chốt lãi (Mặc định +18%)
}

const INITIAL_PORTFOLIO: PortfolioStock[] = [
  {
    id: '1',
    symbol: 'FPT',
    name: 'Tập đoàn FPT',
    shares: 1000,
    buyPrice: 125000,
    currentPrice: 135000,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
  {
    id: '2',
    symbol: 'HPG',
    name: 'Tập đoàn Hòa Phát',
    shares: 2000,
    buyPrice: 28500,
    currentPrice: 26800,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
  {
    id: '3',
    symbol: 'VCB',
    name: 'Vietcombank',
    shares: 500,
    buyPrice: 88000,
    currentPrice: 92500,
    stopLossPercent: 7,
    takeProfitPercent: 18,
  },
];

interface Props {
  stocks?: StockQuote[];
}

export const PortfolioTracker: React.FC<Props> = ({ stocks = [] }) => {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form states for adding stock
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('7');
  const [takeProfit, setTakeProfit] = useState('18');

  // 1. Load portfolio from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('personal_portfolio_v2');
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

  // 2. TỰ ĐỘNG CẬP NHẬT REALTIME GIÁ HIỆN TẠI TỪ BẢNG GIÁ CHỨNG KHOÁN (SSI iBoard)
  useEffect(() => {
    if (stocks.length === 0 || portfolio.length === 0) return;

    let hasUpdate = false;
    const updated = portfolio.map((item) => {
      const liveStock = stocks.find((s) => s.symbol.toUpperCase() === item.symbol.toUpperCase());
      if (liveStock && liveStock.matchedPrice > 0 && liveStock.matchedPrice !== item.currentPrice) {
        hasUpdate = true;
        return {
          ...item,
          currentPrice: liveStock.matchedPrice,
          name: item.name || liveStock.name,
        };
      }
      return item;
    });

    if (hasUpdate) {
      setPortfolio(updated);
    }
  }, [stocks]);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('personal_portfolio_v2', JSON.stringify(portfolio));
    }
  }, [portfolio, isLoaded]);

  // Financial calculations
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

  // Handler: When user types a ticker, auto-suggest current market price
  const handleSymbolChange = (sym: string) => {
    const clean = sym.toUpperCase().trim();
    setSymbol(clean);
    const found = stocks.find((s) => s.symbol.toUpperCase() === clean);
    if (found && found.matchedPrice > 0) {
      if (!buyPrice) setBuyPrice(found.matchedPrice.toString());
    }
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    const cleanSymbol = symbol.toUpperCase().trim();
    const liveStock = stocks.find((s) => s.symbol.toUpperCase() === cleanSymbol);

    const newStock: PortfolioStock = {
      id: Date.now().toString(),
      symbol: cleanSymbol,
      name: liveStock?.name || cleanSymbol,
      shares: parseFloat(shares),
      buyPrice: parseFloat(buyPrice),
      currentPrice: liveStock?.matchedPrice || parseFloat(buyPrice),
      stopLossPercent: parseFloat(stopLoss) || 7,
      takeProfitPercent: parseFloat(takeProfit) || 18,
    };

    setPortfolio([...portfolio, newStock]);
    setSymbol('');
    setShares('');
    setBuyPrice('');
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

  const formatPrice = (val: number) => (val / 1000).toFixed(2);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl p-4 space-y-4 text-xs font-sans">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Sổ Lệnh & Danh Mục Đầu Tư
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Live Sync
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Giá hiện tại tự động cập nhật theo sàn chứng khoán
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm mã mua
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Vốn Đầu Tư (Giá Mua)
          </span>
          <span className="text-sm font-bold text-slate-200">
            {formatVND(totalCost)}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Lãi / Lỗ Realtime
          </span>
          <div className="flex items-center gap-1">
            {totalProfitLoss >= 0 ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{formatVND(totalProfitLoss)} ({totalProfitLossPercent.toFixed(2)}%)
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-400 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {formatVND(totalProfitLoss)} ({totalProfitLossPercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form: Thêm cổ phiếu đã mua */}
      {showAddForm && (
        <form
          onSubmit={handleAddStock}
          className="p-3 bg-slate-950 rounded-xl border border-blue-500/40 space-y-3"
        >
          <div className="font-bold text-blue-400 flex items-center justify-between">
            <span>Thêm cổ phiếu vào sổ lệnh</span>
            <span className="text-[10px] text-slate-400 font-normal">Giá hiện tại sẽ tự động chạy</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Mã CP (trích từ sàn):</label>
              <input
                type="text"
                placeholder="VD: FPT, HPG, SSI"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Số lượng mua (cổ):</label>
              <input
                type="number"
                placeholder="VD: 1000"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Giá mua ban đầu (VNĐ):</label>
              <input
                type="number"
                placeholder="VD: 125000"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Cắt lỗ / Chốt lãi (%):</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  title="% Cắt lỗ"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-1/2 p-2 rounded bg-slate-900 border border-rose-900/60 text-rose-400 font-mono text-center"
                />
                <input
                  type="number"
                  title="% Chốt lãi"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-1/2 p-2 rounded bg-slate-900 border border-emerald-900/60 text-emerald-400 font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-500"
            >
              Lưu sổ lệnh
            </button>
          </div>
        </form>
      )}

      {/* Stock Items List with Stop Loss & Take Profit Advisory */}
      <div className="space-y-3">
        {portfolio.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Chưa có cổ phiếu nào trong danh mục. Nhấn &quot;Thêm mã mua&quot; để bắt đầu theo dõi.
          </p>
        ) : (
          portfolio.map((item) => {
            const costVal = item.shares * item.buyPrice;
            const currentVal = item.shares * item.currentPrice;
            const profitLoss = currentVal - costVal;
            const profitLossPercent = (profitLoss / costVal) * 100;
            const isGain = profitLoss >= 0;

            // Tính điểm cắt lỗ & chốt lời
            const slPercent = item.stopLossPercent || 7;
            const tpPercent = item.takeProfitPercent || 18;
            const stopLossPrice = item.buyPrice * (1 - slPercent / 100);
            const takeProfitPrice = item.buyPrice * (1 + tpPercent / 100);

            // Đánh giá khuyến nghị hành động
            const isStopLossTriggered = item.currentPrice <= stopLossPrice;
            const isTakeProfitTriggered = item.currentPrice >= takeProfitPrice;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isStopLossTriggered
                    ? 'bg-rose-950/20 border-rose-600/50 shadow-md shadow-rose-950/50'
                    : isTakeProfitTriggered
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Row 1: Symbol & Realtime P/L */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-white">{item.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {item.shares.toLocaleString()} CP
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                      {item.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-xs font-mono">
                      {isGain ? (
                        <span className="text-emerald-400 flex items-center justify-end">
                          <TrendingUp className="w-3 h-3 mr-0.5" />+{profitLossPercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center justify-end">
                          <TrendingDown className="w-3 h-3 mr-0.5" />{profitLossPercent.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] font-mono ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isGain ? '+' : ''}{formatVND(profitLoss)}
                    </div>
                  </div>
                </div>

                {/* Row 2: Giá vốn vs Giá Realtime */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono mb-2">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-sans">Giá vốn bạn mua:</span>
                    <strong className="text-slate-300">{formatPrice(item.buyPrice)} đ</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] font-sans">Giá sàn Realtime:</span>
                    <strong className={isGain ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatPrice(item.currentPrice)} đ
                    </strong>
                  </div>
                </div>

                {/* Row 3: CHIẾN LƯỢC CẮT LỖ & CHỐT LÃI (Action Advisory) */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Cắt lỗ khi thủng:
                    </span>
                    <strong className="text-rose-400 font-mono">
                      {formatPrice(stopLossPrice)} đ (-{slPercent}%)
                    </strong>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1 font-sans">
                      <Target className="w-3 h-3 text-emerald-400" />
                      Chốt lãi khi chạm:
                    </span>
                    <strong className="text-emerald-400 font-mono">
                      {formatPrice(takeProfitPrice)} đ (+{tpPercent}%)
                    </strong>
                  </div>

                  {/* Khuyến nghị hành động */}
                  <div className="pt-1.5 flex items-center justify-between">
                    {isStopLossTriggered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        🚨 CẢNH BÁO: Cắt lỗ ngay bảo vệ vốn!
                      </span>
                    ) : isTakeProfitTriggered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        🎯 Đạt mục tiêu: Chốt lãi 50% - 100%!
                      </span>
                    ) : isGain ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Đang có lãi - Tiếp tục nắm giữ đến mục tiêu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        Vẫn trong vùng an toàn - Tiếp tục theo dõi
                      </span>
                    )}

                    <button
                      onClick={() => handleDeleteStock(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Xóa mã này khỏi sổ lệnh"
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
