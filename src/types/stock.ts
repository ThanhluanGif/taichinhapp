export interface StockQuote {
  symbol: string;
  name: string;
  ceiling: number;
  floor: number;
  refPrice: number;
  matchedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  matchedVolume: number;
  totalVolume: number;
  best1Bid: number;
  best1BidVol: number;
  best1Offer: number;
  best1OfferVol: number;
  highest: number;
  lowest: number;
  foreignBuy: number;
  foreignSell: number;
  exchange: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface CompanyProfile {
  ticker: string;
  nameVi: string;
  industry: string;
  website: string;
  marketCap: number;
  pe: number;
  pb: number;
  roe: number;
  roa: number;
  eps: number;
  dividendYield: number;
  beta: number;
  valuationPoint: number;
  financialHealthPoint: number;
  growthPoint: number;
  qualityValuation: string;
  businessOverview: string;
  mainService: string;
}

export type SectorKey =
  | 'WATCHLIST'
  | 'VN30'
  | 'HOSE'
  | 'NGAN_HANG'
  | 'CHUNG_KHOAN'
  | 'BAT_DONG_SAN'
  | 'THEP_VAT_LIEU'
  | 'CONG_NGHE_BAN_LE'
  | 'DAU_KHI_NANG_LUONG';

export interface StocksDataPayload {
  indices?: MarketIndex[];
  vn30: StockQuote[];
  all: StockQuote[];
  sectors: Record<string, string[]>;
  updated_at?: string;
}
