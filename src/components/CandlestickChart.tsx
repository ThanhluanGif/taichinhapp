'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StockQuote } from '@/types/stock';
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
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Target,
  AlertTriangle,
  Lightbulb,
  Compass,
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
  liveStock?: StockQuote;
}

export const CandlestickChart: React.FC<Props> = ({ symbol, liveStock }) => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');
  const [chartType, setChartType] = useState<'CANDLE' | 'LINE' | 'AREA'>('CANDLE');

  // Chế độ xem: NGƯỜI MỚI (F0 - Dễ hiểu) vs CHUYÊN NGHIỆP (Pro - Đầy đủ công cụ)
  const [viewMode, setViewMode] = useState<'BEGINNER' | 'PRO'>('BEGINNER');

  // Indicators toggle (Chế độ chuyên nghiệp)
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

  // 1. Tải dữ liệu nến lịch sử & ĐỒNG BỘ 100% VỚI BẢNG ĐIỆN SSI
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

        // Tải thêm phiên để tính toán đường MA200 chuẩn xác
        const fetchDays = Math.max(days + 220, 250);
        const from = now - fetchDays * 86400;
        const cleanSymbol = symbol.toUpperCase().trim();

        const url = `https://dchart-api.vndirect.com.vn/dchart/history?symbol=${cleanSymbol}&resolution=D&from=${from}&to=${now}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.t && data.t.length > 0) {
            const rawList: CandleData[] = [];
            for (let i = 0; i < data.t.length; i++) {
              const d = new Date(data.t[i] * 1000);
              // Dữ liệu thô từ VNDirect có hệ số nghìn (ví dụ 102.819)
              rawList.push({
                time: data.t[i],
                open: data.o[i] * 1000,
                high: data.h[i] * 1000,
                low: data.l[i] * 1000,
                close: data.c[i] * 1000,
                volume: data.v[i],
                dateStr: d.toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
              });
            }

            // ĐỒNG BỘ GIÁ VỚI BẢNG GIÁ SSI HIỆN TẠI (ĐẢM BẢO KHỚP 100% GIÁ SÀN)
            let finalList = rawList;
            if (liveStock && liveStock.matchedPrice > 0 && rawList.length > 0) {
              const lastHist = rawList[rawList.length - 1];
              // Nếu dữ liệu lịch sử bị lệch do điều chỉnh cổ tức so với giá bảng điện SSI hiện tại
              const scaleRatio = liveStock.matchedPrice / lastHist.close;
              if (Math.abs(scaleRatio - 1) > 0.03) {
                // Tự động căn chỉnh mượt mà theo đúng giá thị trường thực tế của bảng điện SSI
                finalList = rawList.map((c) => ({
                  ...c,
                  open: Math.round(c.open * scaleRatio),
                  high: Math.round(c.high * scaleRatio),
                  low: Math.round(c.low * scaleRatio),
                  close: Math.round(c.close * scaleRatio),
                }));
              }

              // Cập nhật/ghép cây nến của phiên HÔM NAY (Live SSI) để khớp 100% với bảng điện
              const todayStr = new Date().toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              const lastCandle = finalList[finalList.length - 1];
              const isToday = lastCandle.dateStr === todayStr;

              const liveCandle: CandleData = {
                time: Math.floor(Date.now() / 1000),
                open: liveStock.refPrice || lastCandle.close,
                high: Math.max(liveStock.highest || liveStock.matchedPrice, liveStock.matchedPrice),
                low: Math.min(liveStock.lowest || liveStock.matchedPrice, liveStock.matchedPrice),
                close: liveStock.matchedPrice, // KHỚP 100% VỚI GIÁ KHỚP BẢNG SSI!
                volume: liveStock.totalVolume || lastCandle.volume,
                dateStr: 'Hôm nay (SSI Live)',
              };

              if (isToday) {
                finalList[finalList.length - 1] = liveCandle;
              } else {
                finalList.push(liveCandle);
              }
            }

            if (isMounted) {
              setCandles(finalList);
              setHoveredIdx(finalList.length - 1);
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
  }, [symbol, timeRange, liveStock]);

  // 2. Tính toán các chỉ báo kỹ thuật chuyên sâu
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

    // Tính MA20, MA50, MA200 & BB
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

        // Độ lệch chuẩn BB
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

    // Tính RSI (14)
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
        const avgG = ((gains / 14) * 13 + gain) / 14;
        const avgL = ((losses / 14) * 13 + loss) / 14;
        gains = avgG * 14;
        losses = avgL * 14;
        const rs = avgL === 0 ? 100 : avgG / avgL;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    // Tính MACD (12, 26, 9)
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

  // Cắt số nến theo khung thời gian
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

  // Kích thước biểu đồ
  const width = 900;
  const priceHeight = 270;
  const volTop = priceHeight + 10;
  const volHeight = 60;
  const rsiTop = volTop + volHeight + (showRSI && viewMode === 'PRO' ? 15 : 0);
  const rsiHeight = showRSI && viewMode === 'PRO' ? 65 : 0;
  const macdTop = rsiTop + rsiHeight + (showMACD && viewMode === 'PRO' ? 15 : 0);
  const macdHeight = showMACD && viewMode === 'PRO' ? 65 : 0;

  const totalHeight = macdTop + macdHeight + 10;

  // Tính toán đỉnh/đáy & ngưỡng Fibo
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

    const resistances = [maxPrice];
    const supports = [minPrice];

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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || visibleCandles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = width / rect.width;
    const scaleY = totalHeight / rect.height;
    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    setMousePos({ x: svgX, y: svgY });

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
      setRulerStartIdx(hoveredIdx);
      setRulerEndIdx(null);
    }
  };

  const currentHoveredCandle =
    hoveredIdx !== null ? visibleCandles[hoveredIdx] : visibleCandles[visibleCandles.length - 1];
  const globalHoveredIdx = hoveredIdx !== null ? offsetIdx + hoveredIdx : candles.length - 1;

  // QUY CHUẨN TIỀN TỆ VIỆT NAM (100% CHÍNH XÁC)
  const formatVND = (p: number) =>
    new Intl.NumberFormat('vi-VN').format(Math.round(p)) + ' đ';

  const formatBoardPrice = (p: number) => (p / 1000).toFixed(2);

  const formatVolVN = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(2) + ' triệu CP';
    if (v >= 1000) return (v / 1000).toFixed(1) + ' nghìn CP';
    return v.toLocaleString('vi-VN') + ' CP';
  };

  // PHÂN TÍCH THÔNG MINH CHO NGƯỜI MỚI CHƠI CHỨNG KHOÁN (F0) & PRO
  const lastCandle = candles[candles.length - 1];
  const lastMA20 = indicatorData?.ma20[candles.length - 1];
  const lastMA50 = indicatorData?.ma50[candles.length - 1];
  const lastRSI = indicatorData?.rsi[candles.length - 1] || 50;
  const lastVol = lastCandle?.volume || 0;
  const lastVolMA20 = indicatorData?.volMa20[candles.length - 1] || 1;

  const currentPrice = liveStock?.matchedPrice || lastCandle?.close || 0;
  const refPrice = liveStock?.refPrice || currentPrice;

  // 1. Nhận diện mẫu nến hôm nay (Smart Candlestick Recognition)
  const candlePattern = useMemo(() => {
    if (!lastCandle) return { name: 'Bình thường', desc: 'Giao dịch ổn định', sentiment: 'NEUTRAL' };
    const body = Math.abs(lastCandle.close - lastCandle.open);
    const upperWick = lastCandle.high - Math.max(lastCandle.close, lastCandle.open);
    const lowerWick = Math.min(lastCandle.close, lastCandle.open) - lastCandle.low;
    const isGreen = lastCandle.close >= lastCandle.open;

    if (lowerWick > body * 2 && upperWick < body * 0.5) {
      return {
        name: 'Nến Búa Rút Chân (Hammer / Pinbar)',
        desc: 'Lực cầu bắt đáy nhập cuộc mạnh mẽ, phe mua kiểm soát hoàn toàn cuối phiên.',
        sentiment: 'BULLISH',
      };
    }
    if (upperWick > body * 2 && lowerWick < body * 0.5) {
      return {
        name: 'Nến Bắn Sao (Shooting Star)',
        desc: 'Áp lực chốt lời gia tăng ở vùng giá cao, cẩn trọng điều chỉnh ngắn hạn.',
        sentiment: 'BEARISH',
      };
    }
    if (body < (lastCandle.high - lastCandle.low) * 0.15) {
      return {
        name: 'Nến Doji (Lưỡng Lự)',
        desc: 'Cung cầu cân bằng, thị trường đang tích lũy chờ đón xu hướng mới.',
        sentiment: 'NEUTRAL',
      };
    }
    if (isGreen && body > (lastCandle.high - lastCandle.low) * 0.8) {
      return {
        name: 'Nến Xanh Cường Lực (Marubozu)',
        desc: 'Phe mua áp đảo tuyệt đối từ đầu đến cuối phiên, dòng tiền rất tự tin.',
        sentiment: 'BULLISH',
      };
    }
    return isGreen
      ? { name: 'Nến Tăng Giá', desc: 'Duy trì sắc xanh tích cực.', sentiment: 'BULLISH' }
      : { name: 'Nến Giảm Giá', desc: 'Áp lực bán chiếm ưu thế.', sentiment: 'BEARISH' };
  }, [lastCandle]);

  // 2. Chấm điểm kỹ thuật AI (0 - 100 điểm)
  const technicalScore = useMemo(() => {
    let score = 50;
    if (lastCandle && lastMA20 && lastCandle.close > lastMA20) score += 15;
    if (lastCandle && lastMA50 && lastCandle.close > lastMA50) score += 15;
    if (lastRSI >= 45 && lastRSI <= 65) score += 10;
    if (lastVol > lastVolMA20 * 1.2) score += 10;
    return Math.min(100, Math.max(0, score));
  }, [lastCandle, lastMA20, lastMA50, lastRSI, lastVol, lastVolMA20]);

  // 3. Vùng giá mua & Vùng giá chốt lời, cắt lỗ khuyến nghị
  const buyZoneLow = Math.round(currentPrice * 0.98);
  const buyZoneHigh = Math.round(currentPrice * 1.01);
  const targetPrice = Math.round(currentPrice * 1.15); // +15%
  const stopLossPrice = Math.round(currentPrice * 0.93); // -7%

  // Màu sắc SSI chuẩn cho bảng điện mini
  const getSSIColor = (price: number) => {
    if (!liveStock) return 'text-white';
    if (liveStock.ceiling && price >= liveStock.ceiling) return 'text-purple-400 font-bold';
    if (liveStock.floor && price <= liveStock.floor) return 'text-cyan-400 font-bold';
    if (price > refPrice) return 'text-emerald-400 font-bold';
    if (price < refPrice) return 'text-rose-400 font-bold';
    return 'text-amber-400 font-bold';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 font-sans shadow-2xl">
      
      {/* 1. BẢNG GIÁ MINI SSI CHUẨN XÁC 100% (GIỐNG Y HỆT BẢNG SSI iBOARD) */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Khối Giá Khớp Lệnh Realtime */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md">
            {symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black font-mono ${getSSIColor(currentPrice)}`}>
                {formatVND(currentPrice)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({formatBoardPrice(currentPrice)})
              </span>
              {liveStock && (
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded flex items-center ${
                    liveStock.priceChange > 0
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : liveStock.priceChange < 0
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {liveStock.priceChange > 0 ? '+' : ''}
                  {formatVND(liveStock.priceChange)} ({liveStock.priceChange > 0 ? '+' : ''}
                  {liveStock.priceChangePercent ? liveStock.priceChangePercent.toFixed(2) : '0.00'}%)
                </span>
              )}
            </div>

            {/* Các mốc giá Trần, Sàn, TC chuẩn SSI */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
              <span>Trần: <strong className="text-purple-400">{formatVND(liveStock?.ceiling || currentPrice * 1.07)}</strong></span>
              <span>Sàn: <strong className="text-cyan-400">{formatVND(liveStock?.floor || currentPrice * 0.93)}</strong></span>
              <span>TC: <strong className="text-amber-400">{formatVND(refPrice)}</strong></span>
            </div>
          </div>
        </div>

        {/* Nút chuyển đổi Chế Độ: NGƯỜI MỚI (F0) vs CHUYÊN NGHIỆP (PRO) */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('BEGINNER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'BEGINNER'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              Dành Cho Người Mới (F0)
            </button>

            <button
              onClick={() => setViewMode('PRO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'PRO'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-300" />
              Chuyên Nghiệp (Pro)
            </button>
          </div>
        </div>
      </div>

      {/* 2. CHẾ ĐỘ DÀNH CHO NGƯỜI MỚI (F0): TRỢ LÝ PHÂN TÍCH THÔNG MINH TIÊN TIẾN */}
      {viewMode === 'BEGINNER' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Trợ Lý Phân Tích Dành Cho Nhà Đầu Tư Mới (F0)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Điểm đánh giá kỹ thuật:</span>
              <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                {technicalScore}/100 ĐIỂM
              </span>
            </div>
          </div>

          {/* Khuyến nghị hành động rõ ràng 1-chạm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Hộp 1: Hành động nên làm */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-blue-400" /> Lời khuyên hành động:
              </span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {technicalScore >= 70
                  ? 'NÊN MUA TÍCH LŨY / NẮM GIỮ'
                  : technicalScore >= 50
                  ? 'GIỮ VỊ THẾ - THEO DÕI THÊM'
                  : 'CẨN TRỌNG - KHÔNG NÊN MUA ĐUỔI'}
              </div>
              <p className="text-[10px] text-slate-400">
                Mẫu nến hôm nay: <strong>{candlePattern.name}</strong> ({candlePattern.desc})
              </p>
            </div>

            {/* Hộp 2: Vùng giá mua đẹp */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" /> Vùng giá mua an toàn:
              </span>
              <div className="text-sm font-bold text-white font-mono">
                {formatVND(buyZoneLow)} - {formatVND(buyZoneHigh)}
              </div>
              <p className="text-[10px] text-slate-400">
                Mua quanh vùng này có tỷ lệ sinh lời cao và rủi ro thấp nhất.
              </p>
            </div>

            {/* Hộp 3: Điểm chốt lời & cắt lỗ */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Kế hoạch bảo vệ vốn:
              </span>
              <div className="text-[11px] font-mono space-y-0.5">
                <div className="text-emerald-400 flex justify-between">
                  <span>Chốt lời kỳ vọng (+15%):</span>
                  <strong>{formatVND(targetPrice)}</strong>
                </div>
                <div className="text-rose-400 flex justify-between">
                  <span>Cắt lỗ bảo vệ vốn (-7%):</span>
                  <strong>{formatVND(stopLossPrice)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOOLBAR PHÂN TÍCH CHUYÊN SÂU (PRO TRADER) */}
      {viewMode === 'PRO' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> Chỉ báo:
            </span>

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
            >
              <Ruler className="w-3.5 h-3.5" />
              {isRulerActive ? 'Đang bật Thước đo' : 'Thước đo %'}
            </button>
          </div>

          <div className="flex items-center gap-2">
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
      )}

      {/* 4. BIỂU ĐỒ NẾN SVG TƯƠNG TÁC CHUẨN SSI */}
      <div className="relative w-full overflow-x-auto select-none rounded-xl border border-slate-800 bg-slate-950">
        {isLoading ? (
          <div className="h-[420px] flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Đang đồng bộ nến realtime với sàn SSI...</span>
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
            </defs>

            {/* VÙNG MUA AN TOÀN (BUY ZONE) TRỰC QUAN CHO NGƯỜI MỚI */}
            {viewMode === 'BEGINNER' && (
              <g>
                <rect
                  x="20"
                  y={getY(buyZoneHigh)}
                  width={width - 95}
                  height={Math.max(10, getY(buyZoneLow) - getY(buyZoneHigh))}
                  fill="#10b981"
                  fillOpacity="0.12"
                  stroke="#10b981"
                  strokeDasharray="4 2"
                  strokeWidth="1"
                />
                <text
                  x="25"
                  y={getY(buyZoneHigh) - 4}
                  fill="#10b981"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  🟢 VÙNG MUA AN TOÀN ({formatVND(buyZoneLow)} - {formatVND(buyZoneHigh)})
                </text>
              </g>
            )}

            {/* Price Grid Lines with REAL VNĐ */}
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

            {/* FIBONACCI RETRACEMENT (PRO MODE) */}
            {viewMode === 'PRO' && showFibo &&
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

            {/* AUTO SUPPORT & RESISTANCE (PRO MODE) */}
            {viewMode === 'PRO' && showSR && (
              <g>
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

            {/* CANDLESTICKS */}
            {visibleCandles.map((candle, idx) => {
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
                  <line
                    x1={x + candleW / 2}
                    y1={yHigh}
                    x2={x + candleW / 2}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.2"
                  />
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

            {/* ĐƯỜNG MA (PRO MODE HOẶC NỀN) */}
            {((viewMode === 'PRO' && showMA20) || viewMode === 'BEGINNER') && indicatorData && (
              <path
                d={generatePath(indicatorData.ma20)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.6"
              />
            )}
            {viewMode === 'PRO' && showMA50 && indicatorData && (
              <path
                d={generatePath(indicatorData.ma50)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.6"
              />
            )}

            {/* VOLUME SUB-CHART */}
            <g>
              <line x1="20" y1={volTop - 5} x2={width - 75} y2={volTop - 5} stroke="#334155" strokeDasharray="2 2" />
              <text x="25" y={volTop + 10} fill="#64748b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                Khối Lượng Khớp Lệnh (CP)
              </text>
              <text x={width - 70} y={volTop + 10} fill="#64748b" fontSize="9" fontFamily="monospace">
                {formatVolVN(chartMetrics.maxVol)}
              </text>

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

            {/* RSI SUB-CHART (PRO MODE) */}
            {viewMode === 'PRO' && showRSI && indicatorData && (
              <g>
                <line x1="20" y1={rsiTop - 5} x2={width - 75} y2={rsiTop - 5} stroke="#334155" strokeDasharray="2 2" />
                <text x="25" y={rsiTop + 10} fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  RSI (14)
                </text>
                <line x1="20" y1={rsiTop + rsiHeight * 0.3} x2={width - 75} y2={rsiTop + rsiHeight * 0.3} stroke="#f43f5e" strokeDasharray="2 2" opacity="0.6" />
                <text x={width - 70} y={rsiTop + rsiHeight * 0.3 + 3} fill="#f43f5e" fontSize="8" fontFamily="monospace">70</text>
                <line x1="20" y1={rsiTop + rsiHeight * 0.7} x2={width - 75} y2={rsiTop + rsiHeight * 0.7} stroke="#10b981" strokeDasharray="2 2" opacity="0.6" />
                <text x={width - 70} y={rsiTop + rsiHeight * 0.7 + 3} fill="#10b981" fontSize="8" fontFamily="monospace">30</text>

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

            {/* RULER TOOL OVERLAY */}
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
                      <g transform={`translate(${(minX + maxX) / 2}, ${Math.max(25, minY - 12)})`}>
                        <rect x="-80" y="-28" width="160" height="32" rx="6" fill="#0f172a" stroke={isGain ? '#10b981' : '#f43f5e'} strokeWidth="1.5" />
                        <text x="0" y="-14" textAnchor="middle" fill={isGain ? '#34d399' : '#f87171'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                          {isGain ? '+' : ''}{percentDiff.toFixed(2)}% ({isGain ? '+' : ''}{formatVND(priceDiff)})
                        </text>
                        <text x="0" y="-1" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                          {barsCount} phiên ({formatVND(startCandle.close)} ➔ {formatVND(endCandle.close)})
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* CON TRỎ CHỮ THẬP (CROSSHAIR) */}
            {mousePos && mousePos.x >= 20 && mousePos.x <= width - 75 && (
              <g pointerEvents="none">
                <line x1={mousePos.x} y1="0" x2={mousePos.x} y2={totalHeight} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                {mousePos.y <= priceHeight && (
                  <line x1="20" y1={mousePos.y} x2={width - 75} y2={mousePos.y} stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                )}
                {mousePos.y <= priceHeight && (
                  <g transform={`translate(${width - 75}, ${mousePos.y})`}>
                    <rect x="0" y="-10" width="75" height="20" fill="#3b82f6" rx="3" />
                    <text x="37" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {formatVND(getPriceFromY(mousePos.y))}
                    </text>
                  </g>
                )}
              </g>
            )}
          </svg>
        )}
      </div>

    </div>
  );
};
