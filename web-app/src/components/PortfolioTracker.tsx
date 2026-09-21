'use client';

import React, { useState, useEffect } from 'react';
import { StockItem } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  DollarSign,
  Edit2,
  Check,
  X,
  PieChart,
} from 'lucide-react';

const INITIAL_PORTFOLIO: StockItem[] = [
  {
    id: '1',
    symbol: 'FPT',
    name: 'Tập đoàn FPT',
    shares: 1000,
    buyPrice: 110000,
    currentPrice: 135000,
  },
  {
    id: '2',
    symbol: 'HPG',
    name: 'Tập đoàn Hòa Phát',
    shares: 2000,
    buyPrice: 28500,
    currentPrice: 26800,
  },
  {
    id: '3',
    symbol: 'VCB',
    name: 'Vietcombank',
    shares: 500,
    buyPrice: 88000,
    currentPrice: 92500,
  },
];

export const PortfolioTracker: React.FC = () => {
  const [portfolio, setPortfolio] = useState<StockItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form states for adding stock
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');

  // Editing price state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState('');

  // Load portfolio from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('personal_portfolio_v1');
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

  // Save portfolio to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('personal_portfolio_v1', JSON.stringify(portfolio));
    }
  }, [portfolio, isLoaded]);

  // Financial calculations
  const totalCost = portfolio.reduce(
    (acc, item) => acc + item.shares * item.buyPrice,
    0
  );
  const totalCurrentValue = portfolio.reduce(
    (acc, item) => acc + item.shares * item.currentPrice,
    0
  );
  const totalProfitLoss = totalCurrentValue - totalCost;
  const totalProfitLossPercent =
    totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !shares || !buyPrice) return;

    const newStock: StockItem = {
      id: Date.now().toString(),
      symbol: symbol.toUpperCase().trim(),
      shares: parseFloat(shares),
      buyPrice: parseFloat(buyPrice),
      currentPrice: currentPrice ? parseFloat(currentPrice) : parseFloat(buyPrice),
    };

    setPortfolio([...portfolio, newStock]);
    setSymbol('');
    setShares('');
    setBuyPrice('');
    setCurrentPrice('');
    setShowAddForm(false);
  };

  const handleDeleteStock = (id: string) => {
    setPortfolio(portfolio.filter((item) => item.id !== id));
  };

  const startEditPrice = (item: StockItem) => {
    setEditingId(item.id);
    setEditPriceVal(item.currentPrice.toString());
  };

  const saveEditPrice = (id: string) => {
    const parsed = parseFloat(editPriceVal);
    if (!isNaN(parsed) && parsed > 0) {
      setPortfolio(
        portfolio.map((item) =>
          item.id === id ? { ...item, currentPrice: parsed } : item
        )
      );
    }
    setEditingId(null);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh Mục Cổ Phiếu
            </h3>
            <p className="text-[11px] text-slate-400">
              {portfolio.length} mã đang nắm giữ
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm mã
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Giá Trị Hiện Tại
          </span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {formatVND(totalCurrentValue)}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
            Tổng Lãi / Lỗ
          </span>
          <div className="flex items-center gap-1">
            {totalProfitLoss >= 0 ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{formatVND(totalProfitLoss)} ({totalProfitLossPercent.toFixed(2)}%)
              </span>
            ) : (
              <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                {formatVND(totalProfitLoss)} ({totalProfitLossPercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add Stock Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddStock}
          className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs"
        >
          <div className="font-semibold text-blue-900 dark:text-blue-300">
            Thêm cổ phiếu mới
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Mã CP (ví dụ: FPT)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
            <input
              type="number"
              placeholder="Số lượng (cổ)"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
            <input
              type="number"
              placeholder="Giá mua vốn (VNĐ)"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              required
            />
            <input
              type="number"
              placeholder="Giá hiện tại (VNĐ)"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Lưu
            </button>
          </div>
        </form>
      )}

      {/* Stock Items List */}
      <div className="space-y-2">
        {portfolio.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Chưa có cổ phiếu nào trong danh mục.
          </p>
        ) : (
          portfolio.map((item) => {
            const costVal = item.shares * item.buyPrice;
            const currentVal = item.shares * item.currentPrice;
            const profitLoss = currentVal - costVal;
            const profitLossPercent = (profitLoss / costVal) * 100;
            const isGain = profitLoss >= 0;

            return (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between text-xs"
              >
                {/* Symbol & Shares */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {item.shares.toLocaleString()} cổ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Giá vốn: {formatVND(item.buyPrice)}
                  </div>
                </div>

                {/* Price & P/L */}
                <div className="text-right space-y-0.5">
                  <div className="flex items-center justify-end gap-1">
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          className="w-20 px-1 py-0.5 border text-xs rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          onClick={() => saveEditPrice(item.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatVND(item.currentPrice)}
                        </span>
                        <button
                          onClick={() => startEditPrice(item)}
                          className="text-slate-400 hover:text-blue-500 p-0.5"
                          title="Cập nhật giá"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  <div
                    className={`font-semibold text-[11px] flex items-center justify-end gap-0.5 ${
                      isGain
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isGain ? '+' : ''}
                    {profitLossPercent.toFixed(2)}% ({formatVND(profitLoss)})
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteStock(item.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1 ml-2"
                  title="Xóa mã"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
