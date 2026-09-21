'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Loader2, Calendar } from 'lucide-react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dateStr: string;
}

interface Props {
  symbol: string;
}

export const CandlestickChart: React.FC<Props> = ({ symbol }) => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const fetchHistory = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        let days = 90;
        if (timeRange === '1M') days = 30;
        if (timeRange === '3M') days = 90;
        if (timeRange === '6M') days = 180;
        if (timeRange === '1Y') days = 365;

        const from = now - days * 86400;
        const cleanSymbol = symbol.toUpperCase().trim();

        // Fetch official historical OHLCV from VNDirect API (100% Vietnamese stocks, zero Apple)
        const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${cleanSymbol}&resolution=D&from=${from}&to=${now}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.t && data.t.length > 0) {
            const list: CandleData[] = [];
            for (let i = 0; i < data.t.length; i++) {
              const d = new Date(data.t[i] * 1000);
              list.push({
                time: data.t[i],
                open: data.o[i],
                high: data.h[i],
                low: data.l[i],
                close: data.c[i],
                volume: data.v[i],
                dateStr: d.toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
              });
            }
            if (isMounted) {
              setCandles(list);
              setHoveredCandle(list[list.length - 1]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching candlestick data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [symbol, timeRange]);

  // Calculate Chart Boundaries
  const chartMetrics = useMemo(() => {
    if (candles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Add 5% padding to price range
    const pricePadding = (maxPrice - minPrice) * 0.05 || 1000;
    minPrice = Math.max(0, minPrice - pricePadding);
    maxPrice = maxPrice + pricePadding;

    return { minPrice, maxPrice, maxVol };
  }, [candles]);

  const formatPrice = (p: number) => (p / 1000).toFixed(2);
  const formatVol = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toLocaleString('vi-VN');
  };

  const width = 850;
  const height = 400;
  const priceHeight = 280;
  const volHeight = 80;
  const volTop = 310;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 font-sans">
      {/* Top Header: Symbol, Active Candle Data & Time Range Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs">
        {/* Active Candle Info */}
        {hoveredCandle ? (
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span className="font-bold text-white text-sm bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              {symbol}
            </span>
            <span className="text-slate-400 flex items-center gap-1 font-sans">
              <Calendar className="w-3 h-3" />
              {hoveredCandle.dateStr}
            </span>
            <span>
              Mở: <strong className="text-slate-200">{formatPrice(hoveredCandle.open)}</strong>
            </span>
            <span>
              Cao: <strong className="text-emerald-400">{formatPrice(hoveredCandle.high)}</strong>
            </span>
            <span>
              Thấp: <strong className="text-rose-400">{formatPrice(hoveredCandle.low)}</strong>
            </span>
            <span>
              Đóng: <strong className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{formatPrice(hoveredCandle.close)}</strong>
            </span>
            <span>
              KL: <strong className="text-slate-300">{formatVol(hoveredCandle.volume)}</strong>
            </span>
          </div>
        ) : (
          <div className="font-bold text-white font-mono text-sm">{symbol} - Biểu Đồ Nến Nhật</div>
        )}

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono">
          {(['1M', '3M', '6M', '1Y'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                timeRange === t
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Candlestick Chart */}
      <div className="relative w-full overflow-x-auto select-none">
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span>Đang tải dữ liệu nến thực tế của {symbol}...</span>
          </div>
        ) : candles.length === 0 || !chartMetrics ? (
          <div className="h-[400px] flex items-center justify-center text-slate-500">
            Không có dữ liệu nến cho mã {symbol}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[700px] bg-slate-950 rounded-lg border border-slate-800/80"
          >
            {/* Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const y = priceHeight * ratio;
              const priceVal =
                chartMetrics.maxPrice - ratio * (chartMetrics.maxPrice - chartMetrics.minPrice);
              return (
                <g key={idx}>
                  <line
                    x1="40"
                    y1={y}
                    x2={width - 20}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="35"
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatPrice(priceVal)}
                  </text>
                </g>
              );
            })}

            {/* Volume Separator Line */}
            <line
              x1="40"
              y1={volTop - 10}
              x2={width - 20}
              y2={volTop - 10}
              stroke="#334155"
              strokeDasharray="2 2"
            />
            <text
              x="35"
              y={volTop + 10}
              textAnchor="end"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              Vol
            </text>

            {/* Candlestick Bars & Volume Bars */}
            {candles.map((candle, idx) => {
              const candleWidth = Math.max(3, (width - 70) / candles.length - 2);
              const x = 50 + idx * ((width - 70) / candles.length);

              // Price coordinates
              const yHigh =
                ((chartMetrics.maxPrice - candle.high) /
                  (chartMetrics.maxPrice - chartMetrics.minPrice)) *
                priceHeight;
              const yLow =
                ((chartMetrics.maxPrice - candle.low) /
                  (chartMetrics.maxPrice - chartMetrics.minPrice)) *
                priceHeight;
              const yOpen =
                ((chartMetrics.maxPrice - candle.open) /
                  (chartMetrics.maxPrice - chartMetrics.minPrice)) *
                priceHeight;
              const yClose =
                ((chartMetrics.maxPrice - candle.close) /
                  (chartMetrics.maxPrice - chartMetrics.minPrice)) *
                priceHeight;

              const isGreen = candle.close >= candle.open;
              const color = isGreen ? '#10b981' : '#f43f5e';

              const bodyY = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

              // Volume coordinates
              const volBarHeight =
                (candle.volume / (chartMetrics.maxVol || 1)) * volHeight;
              const volY = volTop + volHeight - volBarHeight;

              return (
                <g
                  key={candle.time}
                  onMouseEnter={() => setHoveredCandle(candle)}
                  className="cursor-pointer group"
                >
                  {/* Wick (Râu nến) */}
                  <line
                    x1={x + candleWidth / 2}
                    y1={yHigh}
                    x2={x + candleWidth / 2}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.2"
                  />

                  {/* Body (Thân nến) */}
                  <rect
                    x={x}
                    y={bodyY}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="1"
                  />

                  {/* Volume Bar */}
                  <rect
                    x={x}
                    y={volY}
                    width={candleWidth}
                    height={volBarHeight}
                    fill={color}
                    opacity="0.4"
                  />

                  {/* Invisible hover trigger column */}
                  <rect
                    x={x - 1}
                    y="0"
                    width={candleWidth + 2}
                    height={height}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Nến tăng
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 ml-2"></span> Nến giảm
        </span>
        <span>
          Nguồn dữ liệu: <strong>Sở Giao Dịch Chứng Khoán Việt Nam (HOSE/HNX)</strong>
        </span>
      </div>
    </div>
  );
};
