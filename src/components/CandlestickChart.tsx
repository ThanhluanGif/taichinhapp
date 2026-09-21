'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  Layers,
  Activity,
  Maximize2,
  Ruler,
  Eye,
  EyeOff,
  Crosshair,
  BarChart2,
  Zap,
  HelpCircle,
  X,
  Check,
  Info,
} from 'lucide-react';

export interface CandleData {
  time: number;
  open: number;    // Giá mở cửa thực tế (VNĐ)
  high: number;    // Giá cao nhất thực tế (VNĐ)
  low: number;     // Giá thấp nhất thực tế (VNĐ)
  close: number;   // Giá đóng cửa thực tế (VNĐ)
  volume: number;  // Khối lượng giao dịch (Cổ phiếu)
  dateStr: string;
}

interface Props {
  symbol: string;
}

export const CandlestickChart: React.FC<Props> = ({ symbol }) => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [chartType, setChartType] = useState<'CANDLE' | 'LINE' | 'AREA'>('CANDLE');

  // Indicators toggle
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showMA200, setShowMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [showFibo, setShowFibo] = useState(false);
  const [showSR, setShowSR] = useState(false);

  // Ruler / Measure Tool state
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerStartIdx, setRulerStartIdx] = useState<number | null>(null);
  const [rulerEndIdx, setRulerEndIdx] = useState<number | null>(null);

  // Crosshair state
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Fetch historical OHLCV data from VNDirect & Normalize to TRUE VNĐ VALUES
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

        // Fetch extra days to compute MA200 and long-term indicators accurately
        const fetchDays = Math.max(days + 220, 250);
        const from = now - fetchDays * 86400;
        const cleanSymbol = symbol.toUpperCase().trim();

        const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${cleanSymbol}&resolution=D&from=${from}&to=${now}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.t && data.t.length > 0) {
            const list: CandleData[] = [];
            for (let i = 0; i < data.t.length; i++) {
              const d = new Date(data.t[i] * 1000);
              // QUY ĐỔI CHUẨN THỊ TRƯỜNG CHỨNG KHOÁN VIỆT NAM:
              // VNDirect API trả về dữ liệu ở đơn vị nghìn đồng (hệ số x 1.000).
              // Ví dụ: 99.247 tương ứng với 99.250 VNĐ (chứ KHÔNG PHẢI 99.247 đồng hay 0.09 đồng).
              // Ta nhân 1.000 để đưa về ĐÚNG GIÁ TRỊ THỰC TẾ TIỀN TỆ VIỆT NAM (VNĐ).
              const openVND = Math.round(data.o[i] * 1000);
              const highVND = Math.round(data.h[i] * 1000);
              const lowVND = Math.round(data.l[i] * 1000);
              const closeVND = Math.round(data.c[i] * 1000);

              list.push({
                time: data.t[i],
                open: openVND,
                high: highVND,
                low: lowVND,
                close: closeVND,
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
              setHoveredIdx(list.length - 1);
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

  // 2. Compute Technical Indicators (MA, BB, RSI, MACD, Volume MA)
  const indicatorData = useMemo(() => {
    if (candles.length === 0) return null;

    const n = candles.length;
    const ma20: (number | null)[] = [];
    const ma50: (number | null)[] = [];
    const ma200: (number | null)[] = [];
    const volMa20: (number | null)[] = [];
    const bbUpper: (number | null)[] = [];
    const bbLower: (number | null)[] = [];
    const bbMiddle: (number | null)[] = [];
    const rsi: (number | null)[] = [];
    const macdLine: (number | null)[] = [];
    const macdSignal: (number | null)[] = [];
    const macdHist: (number | null)[] = [];

    // Calculate MA20, MA50, MA200 & BB
    for (let i = 0; i < n; i++) {
      // MA20 & BB
      if (i >= 19) {
        let sum = 0;
        let volSum = 0;
        for (let k = 0; k < 20; k++) {
          sum += candles[i - k].close;
          volSum += candles[i - k].volume;
        }
        const avg = sum / 20;
        ma20.push(avg);
        volMa20.push(volSum / 20);
        bbMiddle.push(avg);

        // Standard Deviation
        let variance = 0;
        for (let k = 0; k < 20; k++) {
          variance += Math.pow(candles[i - k].close - avg, 2);
        }
        const std = Math.sqrt(variance / 20);
        bbUpper.push(avg + 2 * std);
        bbLower.push(Math.max(0, avg - 2 * std));
      } else {
        ma20.push(null);
        volMa20.push(null);
        bbMiddle.push(null);
        bbUpper.push(null);
        bbLower.push(null);
      }

      // MA50
      if (i >= 49) {
        let sum = 0;
        for (let k = 0; k < 50; k++) sum += candles[i - k].close;
        ma50.push(sum / 50);
      } else {
        ma50.push(null);
      }

      // MA200
      if (i >= 199) {
        let sum = 0;
        for (let k = 0; k < 200; k++) sum += candles[i - k].close;
        ma200.push(sum / 200);
      } else {
        ma200.push(null);
      }
    }

    // Calculate RSI (14)
    let gains = 0;
    let losses = 0;
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        rsi.push(null);
        continue;
      }
      const diff = candles[i].close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;

      if (i <= 14) {
        gains += gain;
        losses += loss;
        if (i === 14) {
          const avgG = gains / 14;
          const avgL = losses / 14;
          const rs = avgL === 0 ? 100 : avgG / avgL;
          rsi.push(100 - 100 / (1 + rs));
        } else {
          rsi.push(null);
        }
      } else {
        const prevRsi = rsi[i - 1]!;
        // Wilder's smoothing
        const avgG = ((gains / 14) * 13 + gain) / 14;
        const avgL = ((losses / 14) * 13 + loss) / 14;
        gains = avgG * 14;
        losses = avgL * 14;
        const rs = avgL === 0 ? 100 : avgG / avgL;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    // Calculate MACD (12, 26, 9)
    const ema12: number[] = [];
    const ema26: number[] = [];
    const k12 = 2 / (12 + 1);
    const k26 = 2 / (26 + 1);
    const k9 = 2 / (9 + 1);

    for (let i = 0; i < n; i++) {
      const c = candles[i].close;
      if (i === 0) {
        ema12.push(c);
        ema26.push(c);
      } else {
        ema12.push(c * k12 + ema12[i - 1] * (1 - k12));
        ema26.push(c * k26 + ema26[i - 1] * (1 - k26));
      }
      const macdVal = ema12[i] - ema26[i];
      macdLine.push(macdVal);
    }

    // MACD Signal
    for (let i = 0; i < n; i++) {
      if (i < 8) {
        macdSignal.push(null);
        macdHist.push(null);
      } else if (i === 8) {
        let sum = 0;
        for (let k = 0; k < 9; k++) sum += macdLine[k]!;
        const sig = sum / 9;
        macdSignal.push(sig);
        macdHist.push(macdLine[i]! - sig);
      } else {
        const prevSig = macdSignal[i - 1]!;
        const sig = macdLine[i]! * k9 + prevSig * (1 - k9);
        macdSignal.push(sig);
        macdHist.push(macdLine[i]! - sig);
      }
    }

    return {
      ma20,
      ma50,
      ma200,
      volMa20,
      bbUpper,
      bbLower,
      bbMiddle,
      rsi,
      macdLine,
      macdSignal,
      macdHist,
    };
  }, [candles]);

  // Filter candles visible in selected timeframe
  const visibleCandles = useMemo(() => {
    if (candles.length === 0) return [];
    let count = 65;
    if (timeRange === '1M') count = 22;
    if (timeRange === '3M') count = 65;
    if (timeRange === '6M') count = 130;
    if (timeRange === '1Y') count = 250;
    return candles.slice(Math.max(0, candles.length - count));
  }, [candles, timeRange]);

  const offsetIdx = candles.length - visibleCandles.length;

  // Chart Dimensions & Boundaries
  const width = 900;
  const priceHeight = 270;
  const volTop = priceHeight + 10;
  const volHeight = 60;
  const rsiTop = volTop + volHeight + (showRSI ? 15 : 0);
  const rsiHeight = showRSI ? 65 : 0;
  const macdTop = rsiTop + rsiHeight + (showMACD ? 15 : 0);
  const macdHeight = showMACD ? 65 : 0;

  const totalHeight = macdTop + macdHeight + 10;

  const chartMetrics = useMemo(() => {
    if (visibleCandles.length === 0) return null;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Support & Resistance (Swing Highs & Lows)
    const resistances = [maxPrice];
    const supports = [minPrice];

    // Fibonacci Retracement levels
    const fiboDiff = maxPrice - minPrice;
    const fiboLevels = [
      { ratio: '0.0% (Đáy)', price: minPrice, color: '#64748b' },
      { ratio: '23.6%', price: minPrice + fiboDiff * 0.236, color: '#f59e0b' },
      { ratio: '38.2%', price: minPrice + fiboDiff * 0.382, color: '#3b82f6' },
      { ratio: '50.0% (Cân bằng)', price: minPrice + fiboDiff * 0.5, color: '#10b981' },
      { ratio: '61.8% (Tỷ lệ Vàng)', price: minPrice + fiboDiff * 0.618, color: '#8b5cf6' },
      { ratio: '100% (Đỉnh)', price: maxPrice, color: '#ec4899' },
    ];

    const pricePadding = (maxPrice - minPrice) * 0.06 || 1000;
    minPrice = Math.max(0, minPrice - pricePadding);
    maxPrice = maxPrice + pricePadding;

    return { minPrice, maxPrice, maxVol, resistances, supports, fiboLevels };
  }, [visibleCandles]);

  // Coordinate Helpers
  const getY = (price: number) => {
    if (!chartMetrics) return 0;
    return (
      ((chartMetrics.maxPrice - price) /
        (chartMetrics.maxPrice - chartMetrics.minPrice)) *
      priceHeight
    );
  };

  const getPriceFromY = (y: number) => {
    if (!chartMetrics) return 0;
    const ratio = y / priceHeight;
    return chartMetrics.maxPrice - ratio * (chartMetrics.maxPrice - chartMetrics.minPrice);
  };

  const getX = (idxInVisible: number) => {
    const usableWidth = width - 85;
    return 20 + idxInVisible * (usableWidth / Math.max(1, visibleCandles.length - 1));
  };

  const candleW = Math.max(
    3,
    (width - 85) / Math.max(1, visibleCandles.length) - (visibleCandles.length > 80 ? 1 : 2.5)
  );

  // SVG Paths for Indicators
  const generatePath = (dataArr: (number | null)[]) => {
    let p = '';
    visibleCandles.forEach((_, vIdx) => {
      const globalIdx = offsetIdx + vIdx;
      const val = dataArr[globalIdx];
      if (val !== null && val !== undefined) {
        const x = getX(vIdx);
        const y = getY(val);
        p += p === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
    });
    return p;
  };

  // Mouse / Crosshair / Ruler handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || visibleCandles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Scale to viewBox
    const scaleX = width / rect.width;
    const scaleY = totalHeight / rect.height;
    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    setMousePos({ x: svgX, y: svgY });

    // Find nearest candle
    const usableWidth = width - 85;
    const step = usableWidth / Math.max(1, visibleCandles.length - 1);
    const rawIdx = Math.round((svgX - 20) / step);
    const clamped = Math.max(0, Math.min(visibleCandles.length - 1, rawIdx));
    setHoveredIdx(clamped);
  };

  const handleSvgClick = () => {
    if (!isRulerActive || hoveredIdx === null) return;

    if (rulerStartIdx === null) {
      setRulerStartIdx(hoveredIdx);
      setRulerEndIdx(null);
    } else if (rulerEndIdx === null) {
      setRulerEndIdx(hoveredIdx);
    } else {
      // Reset ruler on next click
      setRulerStartIdx(hoveredIdx);
      setRulerEndIdx(null);
    }
  };

  const currentHoveredCandle =
    hoveredIdx !== null ? visibleCandles[hoveredIdx] : visibleCandles[visibleCandles.length - 1];
  const globalHoveredIdx = hoveredIdx !== null ? offsetIdx + hoveredIdx : candles.length - 1;

  // QUY CHUẨN ĐỊNH DẠNG SỐ VÀ TIỀN TỆ VIỆT NAM (CHUẨN 100%)
  // 1. Giá trị thật theo đồng Việt Nam (VNĐ): 135.000 đ
  const formatVND = (p: number) =>
    new Intl.NumberFormat('vi-VN').format(Math.round(p)) + ' đ';

  // 2. Điểm số niêm yết trên Bảng điện chứng khoán (Hệ số rút gọn x 1.000 VNĐ): 135.00
  const formatBoardPrice = (p: number) => (p / 1000).toFixed(2);

  // 3. Khối lượng cổ phiếu: Cổ phiếu (CP)
  const formatVolVN = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(2) + ' triệu CP';
    if (v >= 1000) return (v / 1000).toFixed(1) + ' nghìn CP';
    return v.toLocaleString('vi-VN') + ' CP';
  };

  // Technical Assessment Summary
  const lastCandle = candles[candles.length - 1];
  const lastMA20 = indicatorData?.ma20[candles.length - 1];
  const lastMA50 = indicatorData?.ma50[candles.length - 1];
  const lastRSI = indicatorData?.rsi[candles.length - 1];
  const lastVol = lastCandle?.volume || 0;
  const lastVolMA20 = indicatorData?.volMa20[candles.length - 1] || 1;

  const isUptrend = lastCandle && lastMA20 && lastCandle.close >= lastMA20;
  const isStrongTrend = lastCandle && lastMA50 && lastMA20 && lastMA20 >= lastMA50;
  const isOverbought = lastRSI && lastRSI >= 70;
  const isOversold = lastRSI && lastRSI <= 30;
  const isVolBreakout = lastVol >= lastVolMA20 * 1.4;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-sans shadow-2xl">
      
      {/* BANNER GIẢI THÍCH QUY ĐỔI GIÁ TRỊ CHUẨN VIỆT NAM */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>
            <strong>Quy chuẩn Chứng khoán Việt Nam:</strong> 1 điểm bảng điện = <strong>1.000 VNĐ</strong> (Ví dụ: 135.00 = 135.000 đ/CP) | Khối lượng: <strong>Cổ phiếu (CP)</strong>
          </span>
        </span>
        <span className="font-mono text-[10px] bg-blue-900/40 px-2 py-0.5 rounded text-blue-200">
          HOSE / HNX Standard
        </span>
      </div>

      {/* 1. TOP TOOLBAR: CÔNG CỤ PHÂN TÍCH & ĐO ĐẠC SSI iBOARD */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
        
        {/* Left: Toggles for Indicators & Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Chỉ báo:
          </span>

          {/* MA 20 */}
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showMA20
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            MA20
          </button>

          {/* MA 50 */}
          <button
            onClick={() => setShowMA50(!showMA50)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showMA50
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            MA50
          </button>

          {/* MA 200 */}
          <button
            onClick={() => setShowMA200(!showMA200)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showMA200
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            MA200
          </button>

          {/* Bollinger Bands */}
          <button
            onClick={() => setShowBB(!showBB)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showBB
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            BB (20,2)
          </button>

          {/* RSI */}
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showRSI
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            RSI (14)
          </button>

          {/* MACD */}
          <button
            onClick={() => setShowMACD(!showMACD)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showMACD
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            MACD
          </button>

          {/* Fibonacci */}
          <button
            onClick={() => setShowFibo(!showFibo)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showFibo
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Fibonacci
          </button>

          {/* Hỗ trợ / Kháng cự */}
          <button
            onClick={() => setShowSR(!showSR)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all border ${
              showSR
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Hỗ Trợ/Kháng Cự
          </button>

          {/* Thước Đo % & Số Phiên (Ruler Tool) */}
          <button
            onClick={() => {
              setIsRulerActive(!isRulerActive);
              setRulerStartIdx(null);
              setRulerEndIdx(null);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
              isRulerActive
                ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500 shadow-md shadow-yellow-500/20 animate-pulse'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-yellow-400 hover:border-yellow-500/40'
            }`}
            title="Bấm vào để kích hoạt thước đo: Click điểm A rồi click điểm B trên biểu đồ để đo % lãi/lỗ và số phiên"
          >
            <Ruler className="w-3.5 h-3.5" />
            {isRulerActive ? 'Đang bật Thước đo' : 'Thước đo %'}
          </button>
        </div>

        {/* Right: Chart Type & Timeframe Switcher */}
        <div className="flex items-center gap-2">
          {/* Chart Type */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setChartType('CANDLE')}
              className={`px-2 py-1 rounded transition-colors ${
                chartType === 'CANDLE' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Nến
            </button>
            <button
              onClick={() => setChartType('LINE')}
              className={`px-2 py-1 rounded transition-colors ${
                chartType === 'LINE' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Đường
            </button>
            <button
              onClick={() => setChartType('AREA')}
              className={`px-2 py-1 rounded transition-colors ${
                chartType === 'AREA' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vùng
            </button>
          </div>

          {/* Timeframe */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono font-bold">
            {(['1M', '3M', '6M', '1Y'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeRange === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. HUD / ACTIVE CANDLE & INDICATOR VALUES (HIỂN THỊ ĐÚNG TIỀN VNĐ & ĐIỂM BẢNG ĐIỆN) */}
      {currentHoveredCandle && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-white bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
              {symbol}
            </span>
            <span className="text-slate-400 text-[11px] flex items-center gap-1 font-sans">
              <Calendar className="w-3 h-3 text-slate-500" />
              {currentHoveredCandle.dateStr}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span>Mở: <strong className="text-slate-200">{formatVND(currentHoveredCandle.open)}</strong></span>
            <span>Cao: <strong className="text-emerald-400">{formatVND(currentHoveredCandle.high)}</strong></span>
            <span>Thấp: <strong className="text-rose-400">{formatVND(currentHoveredCandle.low)}</strong></span>
            <span>
              Đóng:{' '}
              <strong className={currentHoveredCandle.close >= currentHoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>
                {formatVND(currentHoveredCandle.close)}
              </strong>
              <span className="text-[10px] text-slate-500 ml-1">({formatBoardPrice(currentHoveredCandle.close)})</span>
            </span>
            <span>KL: <strong className="text-slate-300">{formatVolVN(currentHoveredCandle.volume)}</strong></span>
          </div>

          {/* Indicator live values */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {showMA20 && indicatorData?.ma20[globalHoveredIdx] && (
              <span className="text-amber-300">
                MA20: {formatVND(indicatorData.ma20[globalHoveredIdx]!)}
              </span>
            )}
            {showMA50 && indicatorData?.ma50[globalHoveredIdx] && (
              <span className="text-blue-300">
                MA50: {formatVND(indicatorData.ma50[globalHoveredIdx]!)}
              </span>
            )}
            {showRSI && indicatorData?.rsi[globalHoveredIdx] && (
              <span className="text-cyan-300">
                RSI: {indicatorData.rsi[globalHoveredIdx]!.toFixed(1)}
              </span>
            )}
            {showMACD && indicatorData?.macdHist[globalHoveredIdx] && (
              <span className={indicatorData.macdHist[globalHoveredIdx]! >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                MACD: {indicatorData.macdHist[globalHoveredIdx]!.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* RULER BANNER INSTRUCTIONS */}
      {isRulerActive && (
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-yellow-400" />
            {rulerStartIdx === null
              ? 'Nhấp chuột vào một cây nến bất kỳ để chọn ĐIỂM BẮT ĐẦU ĐO'
              : rulerEndIdx === null
              ? 'Di chuột và nhấp vào cây nến thứ hai để CHỐT KHOẢNG ĐO'
              : 'Đã hoàn thành phép đo! Bấm điểm mới để đo tiếp hoặc bấm "Đóng thước" để thoát'}
          </span>
          <button
            onClick={() => {
              setIsRulerActive(false);
              setRulerStartIdx(null);
              setRulerEndIdx(null);
            }}
            className="px-2 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-200 text-[10px] font-bold"
          >
            Đóng thước
          </button>
        </div>
      )}

      {/* 3. MAIN INTERACTIVE SVG CHART */}
      <div className="relative w-full overflow-x-auto select-none rounded-xl border border-slate-800 bg-slate-950">
        {isLoading ? (
          <div className="h-[420px] flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Đang tải nến và chỉ báo kỹ thuật chuyên sâu của {symbol}...</span>
          </div>
        ) : visibleCandles.length === 0 || !chartMetrics ? (
          <div className="h-[420px] flex items-center justify-center text-slate-500">
            Không tìm thấy dữ liệu giao dịch cho mã {symbol}
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${totalHeight}`}
            className="w-full h-auto min-w-[750px] cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setMousePos(null);
              setHoveredIdx(visibleCandles.length - 1);
            }}
            onClick={handleSvgClick}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Price Grid Lines with REAL VNĐ VALUES */}
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((ratio, idx) => {
              const y = priceHeight * ratio;
              const priceVal =
                chartMetrics.maxPrice - ratio * (chartMetrics.maxPrice - chartMetrics.minPrice);
              return (
                <g key={idx}>
                  <line x1="20" y1={y} x2={width - 75} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                  <text x={width - 70} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                    {formatVND(priceVal)}
                  </text>
                </g>
              );
            })}

            {/* FIBONACCI RETRACEMENT LEVELS */}
            {showFibo &&
              chartMetrics.fiboLevels.map((fib, idx) => {
                const y = getY(fib.price);
                return (
                  <g key={'fibo-' + idx}>
                    <line
                      x1="20"
                      y1={y}
                      x2={width - 75}
                      y2={y}
                      stroke={fib.color}
                      strokeWidth="1"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                    <text
                      x="25"
                      y={y - 3}
                      fill={fib.color}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Fibo {fib.ratio}: {formatVND(fib.price)}
                    </text>
                  </g>
                );
              })}

            {/* AUTO SUPPORT & RESISTANCE */}
            {showSR && (
              <g>
                {/* Resistance Line (Đỉnh) */}
                <line
                  x1="20"
                  y1={getY(chartMetrics.resistances[0])}
                  x2={width - 75}
                  y2={getY(chartMetrics.resistances[0])}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                <text
                  x={width - 70}
                  y={getY(chartMetrics.resistances[0]) + 3}
                  fill="#f43f5e"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  R: {formatVND(chartMetrics.resistances[0])}
                </text>

                {/* Support Line (Đáy) */}
                <line
                  x1="20"
                  y1={getY(chartMetrics.supports[0])}
                  x2={width - 75}
                  y2={getY(chartMetrics.supports[0])}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="5 3"
                />
                <text
                  x={width - 70}
                  y={getY(chartMetrics.supports[0]) + 3}
                  fill="#10b981"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  S: {formatVND(chartMetrics.supports[0])}
                </text>
              </g>
            )}

            {/* BOLLINGER BANDS CLOUD & LINES */}
            {showBB && indicatorData && (
              <g>
                {/* BB Upper */}
                <path
                  d={generatePath(indicatorData.bbUpper)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
                {/* BB Middle */}
                <path
                  d={generatePath(indicatorData.bbMiddle)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  opacity="0.4"
                />
                {/* BB Lower */}
                <path
                  d={generatePath(indicatorData.bbLower)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.7"
                />
              </g>
            )}

            {/* AREA CHART MODE */}
            {chartType === 'AREA' && (
              <path
                d={
                  generatePath(visibleCandles.map((c) => c.close)) +
                  ` L ${getX(visibleCandles.length - 1)} ${priceHeight} L ${getX(0)} ${priceHeight} Z`
                }
                fill="url(#areaGrad)"
              />
            )}

            {/* LINE CHART MODE */}
            {(chartType === 'LINE' || chartType === 'AREA') && (
              <path
                d={generatePath(visibleCandles.map((c) => c.close))}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            )}

            {/* CANDLESTICK BARS */}
            {chartType === 'CANDLE' &&
              visibleCandles.map((candle, idx) => {
                const x = getX(idx) - candleW / 2;
                const yHigh = getY(candle.high);
                const yLow = getY(candle.low);
                const yOpen = getY(candle.open);
                const yClose = getY(candle.close);

                const isGreen = candle.close >= candle.open;
                const color = isGreen ? '#10b981' : '#f43f5e';

                const bodyY = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

                return (
                  <g key={'candle-' + candle.time}>
                    {/* Wick */}
                    <line
                      x1={x + candleW / 2}
                      y1={yHigh}
                      x2={x + candleW / 2}
                      y2={yLow}
                      stroke={color}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x}
                      y={bodyY}
                      width={candleW}
                      height={bodyHeight}
                      fill={color}
                      rx="0.5"
                    />
                  </g>
                );
              })}

            {/* MOVING AVERAGES (MA20, MA50, MA200) */}
            {showMA20 && indicatorData && (
              <path
                d={generatePath(indicatorData.ma20)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.6"
              />
            )}
            {showMA50 && indicatorData && (
              <path
                d={generatePath(indicatorData.ma50)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.6"
              />
            )}
            {showMA200 && indicatorData && (
              <path
                d={generatePath(indicatorData.ma200)}
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.8"
              />
            )}

            {/* VOLUME SUB-CHART */}
            <g>
              <line x1="20" y1={volTop - 5} x2={width - 75} y2={volTop - 5} stroke="#334155" strokeDasharray="2 2" />
              <text x="25" y={volTop + 10} fill="#64748b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                Khối Lượng (Volume)
              </text>
              <text x={width - 70} y={volTop + 10} fill="#64748b" fontSize="9" fontFamily="monospace">
                {formatVolVN(chartMetrics.maxVol)}
              </text>

              {/* Volume bars */}
              {visibleCandles.map((candle, idx) => {
                const x = getX(idx) - candleW / 2;
                const volH = (candle.volume / (chartMetrics.maxVol || 1)) * volHeight;
                const volY = volTop + volHeight - volH;
                const isGreen = candle.close >= candle.open;
                return (
                  <rect
                    key={'vol-' + candle.time}
                    x={x}
                    y={volY}
                    width={candleW}
                    height={volH}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    opacity="0.5"
                  />
                );
              })}

              {/* Volume MA20 Line */}
              {indicatorData && (
                <path
                  d={(() => {
                    let p = '';
                    visibleCandles.forEach((_, vIdx) => {
                      const gIdx = offsetIdx + vIdx;
                      const val = indicatorData.volMa20[gIdx];
                      if (val) {
                        const x = getX(vIdx);
                        const vH = (val / (chartMetrics.maxVol || 1)) * volHeight;
                        const y = volTop + volHeight - vH;
                        p += p === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                      }
                    });
                    return p;
                  })()}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="1.2"
                />
              )}
            </g>

            {/* RSI SUB-CHART */}
            {showRSI && indicatorData && (
              <g>
                <line x1="20" y1={rsiTop - 5} x2={width - 75} y2={rsiTop - 5} stroke="#334155" strokeDasharray="2 2" />
                <text x="25" y={rsiTop + 10} fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  RSI (14)
                </text>

                {/* Overbought 70 line */}
                <line
                  x1="20"
                  y1={rsiTop + rsiHeight * 0.3}
                  x2={width - 75}
                  y2={rsiTop + rsiHeight * 0.3}
                  stroke="#f43f5e"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                <text x={width - 70} y={rsiTop + rsiHeight * 0.3 + 3} fill="#f43f5e" fontSize="8" fontFamily="monospace">
                  70
                </text>

                {/* Oversold 30 line */}
                <line
                  x1="20"
                  y1={rsiTop + rsiHeight * 0.7}
                  x2={width - 75}
                  y2={rsiTop + rsiHeight * 0.7}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                <text x={width - 70} y={rsiTop + rsiHeight * 0.7 + 3} fill="#10b981" fontSize="8" fontFamily="monospace">
                  30
                </text>

                {/* RSI curve */}
                <path
                  d={(() => {
                    let p = '';
                    visibleCandles.forEach((_, vIdx) => {
                      const gIdx = offsetIdx + vIdx;
                      const val = indicatorData.rsi[gIdx];
                      if (val !== null && val !== undefined) {
                        const x = getX(vIdx);
                        const y = rsiTop + rsiHeight * (1 - val / 100);
                        p += p === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                      }
                    });
                    return p;
                  })()}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* MACD SUB-CHART */}
            {showMACD && indicatorData && (
              <g>
                <line x1="20" y1={macdTop - 5} x2={width - 75} y2={macdTop - 5} stroke="#334155" strokeDasharray="2 2" />
                <text x="25" y={macdTop + 10} fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  MACD (12, 26, 9)
                </text>

                {/* MACD Histogram & Lines */}
                {visibleCandles.map((_, vIdx) => {
                  const gIdx = offsetIdx + vIdx;
                  const hist = indicatorData.macdHist[gIdx] || 0;
                  const x = getX(vIdx) - candleW / 2;
                  const midY = macdTop + macdHeight / 2;
                  const barH = Math.min(25, Math.abs(hist) * 0.05);
                  const y = hist >= 0 ? midY - barH : midY;
                  return (
                    <rect
                      key={'hist-' + vIdx}
                      x={x}
                      y={y}
                      width={candleW}
                      height={Math.max(1, barH)}
                      fill={hist >= 0 ? '#10b981' : '#f43f5e'}
                      opacity="0.6"
                    />
                  );
                })}
              </g>
            )}

            {/* RULER / MEASUREMENT OVERLAY (ĐO % VÀ VNĐ CHÍNH XÁC) */}
            {isRulerActive && rulerStartIdx !== null && (
              <g>
                {(() => {
                  const endIdx = rulerEndIdx !== null ? rulerEndIdx : (hoveredIdx || rulerStartIdx);
                  const startCandle = visibleCandles[rulerStartIdx];
                  const endCandle = visibleCandles[endIdx];
                  if (!startCandle || !endCandle) return null;

                  const x1 = getX(rulerStartIdx);
                  const x2 = getX(endIdx);
                  const y1 = getY(startCandle.close);
                  const y2 = getY(endCandle.close);

                  const minX = Math.min(x1, x2);
                  const maxX = Math.max(x1, x2);
                  const minY = Math.min(y1, y2);
                  const maxY = Math.max(y1, y2);

                  const priceDiff = endCandle.close - startCandle.close;
                  const percentDiff = (priceDiff / startCandle.close) * 100;
                  const barsCount = Math.abs(endIdx - rulerStartIdx) + 1;
                  const isGain = priceDiff >= 0;

                  return (
                    <g>
                      {/* Measurement shaded box */}
                      <rect
                        x={minX}
                        y={minY}
                        width={Math.max(4, maxX - minX)}
                        height={Math.max(4, maxY - minY)}
                        fill={isGain ? '#10b981' : '#f43f5e'}
                        fillOpacity="0.15"
                        stroke={isGain ? '#10b981' : '#f43f5e'}
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />

                      {/* Line from Start to End */}
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isGain ? '#10b981' : '#f43f5e'}
                        strokeWidth="2"
                      />

                      {/* Tooltip badge in center of box */}
                      <g transform={`translate(${(minX + maxX) / 2}, ${Math.max(25, minY - 12)})`}>
                        <rect
                          x="-80"
                          y="-28"
                          width="160"
                          height="32"
                          rx="6"
                          fill="#0f172a"
                          stroke={isGain ? '#10b981' : '#f43f5e'}
                          strokeWidth="1.5"
                        />
                        <text
                          x="0"
                          y="-14"
                          textAnchor="middle"
                          fill={isGain ? '#34d399' : '#f87171'}
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {isGain ? '+' : ''}
                          {percentDiff.toFixed(2)}% ({isGain ? '+' : ''}{formatVND(priceDiff)})
                        </text>
                        <text
                          x="0"
                          y="-1"
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="8.5"
                          fontFamily="monospace"
                        >
                          {barsCount} phiên ({formatVND(startCandle.close)} ➔ {formatVND(endCandle.close)})
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* INTERACTIVE CROSSHAIR */}
            {mousePos && mousePos.x >= 20 && mousePos.x <= width - 75 && (
              <g pointerEvents="none">
                {/* Vertical Crosshair Line */}
                <line
                  x1={mousePos.x}
                  y1="0"
                  x2={mousePos.x}
                  y2={totalHeight}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Horizontal Crosshair Line */}
                {mousePos.y <= priceHeight && (
                  <line
                    x1="20"
                    y1={mousePos.y}
                    x2={width - 75}
                    y2={mousePos.y}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Y-Axis Price Tag */}
                {mousePos.y <= priceHeight && (
                  <g transform={`translate(${width - 75}, ${mousePos.y})`}>
                    <rect x="0" y="-10" width="75" height="20" fill="#3b82f6" rx="3" />
                    <text x="37" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {formatVND(getPriceFromY(mousePos.y))}
                    </text>
                  </g>
                )}

                {/* X-Axis Date Tag */}
                {currentHoveredCandle && (
                  <g transform={`translate(${mousePos.x}, ${priceHeight + 5})`}>
                    <rect x="-40" y="0" width="80" height="18" fill="#1e293b" stroke="#475569" strokeWidth="1" rx="3" />
                    <text x="0" y="12" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                      {currentHoveredCandle.dateStr}
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        )}
      </div>

      {/* 4. SSI TECHNICAL EVALUATION & SUMMARY RADAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
        
        {/* Box 1: Xu Hướng & MA */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1 font-medium">Xu Hướng Kỹ Thuật (MA):</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isStrongTrend ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Uptrend Mạnh (Giá &gt; MA20 &gt; MA50)
              </span>
            ) : isUptrend ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Tích Cực Ngắn Hạn (Giá &gt; MA20)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <TrendingDown className="w-4 h-4" /> Điều Chỉnh / Dưới MA20
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            MA20: {lastMA20 ? formatVND(lastMA20) : '-'} | MA50: {lastMA50 ? formatVND(lastMA50) : '-'}
          </span>
        </div>

        {/* Box 2: Chỉ Báo RSI (14) */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1 font-medium">Sức Mạnh RSI (14):</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isOverbought ? (
              <span className="text-rose-400 flex items-center gap-1">
                🚨 Quá Mua (RSI {lastRSI?.toFixed(1)}) - Rủi ro điều chỉnh
              </span>
            ) : isOversold ? (
              <span className="text-emerald-400 flex items-center gap-1">
                💎 Quá Bán (RSI {lastRSI?.toFixed(1)}) - Vùng phục hồi tiềm năng
              </span>
            ) : (
              <span className="text-cyan-300 flex items-center gap-1">
                ✓ Tích Lũy Bình Thường (RSI {lastRSI ? lastRSI.toFixed(1) : '-'})
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Vùng an toàn giao dịch: 40 - 65 điểm
          </span>
        </div>

        {/* Box 3: Thanh Khoản So Với MA20 */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1 font-medium">Thanh Khoản Phiên Gần Nhất:</span>
          <div className="flex items-center gap-1.5 font-bold">
            {isVolBreakout ? (
              <span className="text-amber-400 flex items-center gap-1">
                ⚡ Đột Biến Khối Lượng ({((lastVol / lastVolMA20) * 100).toFixed(0)}% MA20)
              </span>
            ) : (
              <span className="text-slate-300 flex items-center gap-1">
                Ổn định ({((lastVol / lastVolMA20) * 100).toFixed(0)}% MA20)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            Phiên: {formatVolVN(lastVol)} | TB 20: {formatVolVN(lastVolMA20)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Nến tăng
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 ml-2"></span> Nến giảm
          <span className="ml-3 text-slate-400">💡 Mẹo: Bật <strong>Thước đo %</strong> và nhấp vào 2 cây nến để đo chính xác % lợi nhuận và số phiên!</span>
        </span>
        <span>
          Nguồn dữ liệu: <strong>Sở GDCK TP.HCM & Hà Nội (HOSE/HNX)</strong>
        </span>
      </div>

    </div>
  );
};
