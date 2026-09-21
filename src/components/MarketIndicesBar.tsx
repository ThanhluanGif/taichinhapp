'use client';

import React from 'react';
import { MarketIndex } from '@/types/stock';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  indices: MarketIndex[];
}

export const MarketIndicesBar: React.FC<Props> = ({ indices }) => {
  if (!indices || indices.length === 0) return null;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto flex items-center gap-4 sm:gap-8 text-xs font-mono">
        {indices.map((idx) => {
          const isGain = idx.change > 0;
          const isLoss = idx.change < 0;
          const isFlat = idx.change === 0;

          const colorClass = isGain
            ? 'text-emerald-400'
            : isLoss
            ? 'text-rose-400'
            : 'text-amber-400';

          const bgBadge = isGain
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : isLoss
            ? 'bg-rose-500/10 border-rose-500/20'
            : 'bg-amber-500/10 border-amber-500/20';

          return (
            <div
              key={idx.symbol}
              className="flex items-center gap-2 whitespace-nowrap py-0.5"
            >
              <span className="font-bold text-slate-300 font-sans">
                {idx.name}:
              </span>
              <span className={`font-bold ${colorClass}`}>
                {idx.value.toLocaleString('vi-VN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>

              <div
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium border ${bgBadge} ${colorClass}`}
              >
                {isGain && <TrendingUp className="w-3 h-3" />}
                {isLoss && <TrendingDown className="w-3 h-3" />}
                {isFlat && <Minus className="w-3 h-3" />}
                <span>
                  {isGain ? '+' : ''}
                  {idx.change.toFixed(2)}
                </span>
                <span>
                  ({isGain ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
