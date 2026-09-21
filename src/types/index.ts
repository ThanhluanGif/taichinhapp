export type NewsCategory = 'ALL' | 'MACRO' | 'MARKET' | 'ENTERPRISE';

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  summary: string;
  image?: string;
  source: string;
  category: NewsCategory;
  published_at: string;
  created_at?: string;
}

export interface StockItem {
  id: string;
  symbol: string;        // e.g. "FPT", "HPG", "VCB"
  name?: string;         // e.g. "Tập đoàn FPT"
  shares: number;        // Số lượng cổ phiếu
  buyPrice: number;      // Giá vốn trung bình (VND)
  currentPrice: number;  // Giá hiện tại (VND)
  targetPrice?: number;  // Giá mục tiêu
  stopLossPrice?: number;// Giá cắt lỗ
  notes?: string;        // Ghi chú cá nhân
}
