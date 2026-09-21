"""
Fetches real-time stock quotes from SSI iBoard for VN30 and HOSE (VN-Index),
Market Indices from VNDirect, and Company Profiles & Financial Ratios from Simplize.
"""

import os
import json
import time
import requests

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

SECTOR_MAPPING = {
    "NGAN_HANG": ["VCB", "BID", "CTG", "TCB", "MBB", "VPB", "ACB", "STB", "HDB", "VIB", "TPB", "SHB", "LPB", "MSB", "OCB", "EIB", "SSB", "NAB"],
    "CHUNG_KHOAN": ["SSI", "VND", "VCI", "HCM", "SHS", "MBS", "FTS", "BSI", "CTS", "VIX", "AGR", "ORS", "TVS"],
    "BAT_DONG_SAN": ["VHM", "VIC", "VRE", "NVL", "PDR", "DIG", "DXG", "KDH", "NLG", "KBC", "CEO", "IDC", "VGC", "TCH", "HQC", "BCM", "SCR"],
    "THEP_VAT_LIEU": ["HPG", "HSG", "NKG", "VGS", "TLH", "SMC", "HT1", "BCC"],
    "CONG_NGHE_BAN_LE": ["FPT", "MWG", "DGW", "FRT", "CMG", "CTR", "PNJ", "MSN"],
    "DAU_KHI_NANG_LUONG": ["GAS", "PVD", "PVS", "BSR", "PLX", "POW", "REE", "PC1", "GEG", "NT2", "HDG"]
}

def clean_stock_item(raw: dict) -> dict:
    return {
        "symbol": raw.get("stockSymbol", ""),
        "name": raw.get("companyNameVi", ""),
        "ceiling": raw.get("ceiling", 0),
        "floor": raw.get("floor", 0),
        "refPrice": raw.get("refPrice", 0),
        "matchedPrice": raw.get("matchedPrice", raw.get("refPrice", 0)),
        "priceChange": raw.get("priceChange", 0),
        "priceChangePercent": raw.get("priceChangePercent", 0),
        "matchedVolume": raw.get("matchedVolume", 0),
        "totalVolume": raw.get("nmTotalTradedQty", raw.get("stockVol", 0)),
        "best1Bid": raw.get("best1Bid", 0),
        "best1BidVol": raw.get("best1BidVol", 0),
        "best1Offer": raw.get("best1Offer", 0),
        "best1OfferVol": raw.get("best1OfferVol", 0),
        "highest": raw.get("highest", 0),
        "lowest": raw.get("lowest", 0),
        "foreignBuy": raw.get("buyForeignQtty", 0),
        "foreignSell": raw.get("sellForeignQtty", 0),
        "exchange": raw.get("exchange", "hose").upper()
    }

def fetch_market_indices():
    now = int(time.time())
    from_time = now - 86400 * 30
    indices = []
    targets = [
        ('VNINDEX', 'VN-INDEX'),
        ('VN30', 'VN30-INDEX'),
        ('HNX', 'HNX-INDEX'),
        ('UPCOM', 'UPCOM-INDEX')
    ]
    for sym, name in targets:
        try:
            url = f'https://dchart-api.vndirect.com.vn/dchart/history?symbol={sym}&resolution=D&from={from_time}&to={now}'
            r = requests.get(url, headers=HEADERS, timeout=5)
            d = r.json()
            if d.get('c'):
                latest = d['c'][-1]
                prev = d['c'][-2] if len(d['c']) > 1 else latest
                chg = round(latest - prev, 2)
                pct = round((chg / prev) * 100, 2) if prev else 0
                indices.append({
                    'symbol': sym,
                    'name': name,
                    'value': latest,
                    'change': chg,
                    'changePercent': pct
                })
        except Exception as e:
            print(f"⚠️ Lỗi tải chỉ số {sym}: {e}")
    return indices

def fetch_company_profiles(symbols):
    profiles = {}
    print(f"📊 Đang tải hồ sơ & chỉ số tài chính cho {len(symbols)} cổ phiếu trọng điểm...")
    for sym in symbols[:35]: # Top 35 stocks
        try:
            url = f"https://api.simplize.vn/api/company/summary/{sym}"
            r = requests.get(url, headers=HEADERS, timeout=4)
            if r.status_code == 200:
                data = r.json().get('data', {})
                profiles[sym] = {
                    "ticker": sym,
                    "nameVi": data.get("nameVi", ""),
                    "industry": data.get("industryActivity", ""),
                    "website": data.get("website", ""),
                    "marketCap": data.get("marketCap", 0),
                    "pe": data.get("peRatio", 0),
                    "pb": data.get("pbRatio", 0),
                    "roe": round(data.get("roe", 0), 2) if data.get("roe") else 0,
                    "roa": round(data.get("roa", 0), 2) if data.get("roa") else 0,
                    "eps": data.get("epsRatio", 0),
                    "dividendYield": round(data.get("dividendYieldCurrent", 0) * 100, 2) if data.get("dividendYieldCurrent") else 0,
                    "beta": round(data.get("beta5y", 1.0), 2) if data.get("beta5y") else 1.0,
                    "valuationPoint": data.get("valuationPoint", 0),
                    "financialHealthPoint": data.get("financialHealthPoint", 0),
                    "growthPoint": data.get("growthPoint", 0),
                    "qualityValuation": data.get("qualityValuation", "Đang cập nhật"),
                    "businessOverview": data.get("businessLine", ""),
                    "mainService": data.get("mainService", "")
                }
        except Exception as e:
            print(f"⚠️ Không thể tải hồ sơ {sym}: {e}")
    return profiles

def fetch_all_stocks():
    print("🚀 Bắt đầu lấy dữ liệu bảng giá SSI iBoard & Chỉ số thị trường...")
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/data"))
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Fetch Market Indices
    indices = fetch_market_indices()
    with open(os.path.join(output_dir, "indices.json"), "w", encoding="utf-8") as f:
        json.dump(indices, f, ensure_ascii=False, indent=2)
    print(f"✅ Đã lưu {len(indices)} chỉ số thị trường (VNINDEX, VN30, HNX, UPCOM)")

    # 2. Fetch VN30
    vn30_stocks = []
    try:
        r_vn30 = requests.get('https://iboard-query.ssi.com.vn/stock/group/VN30', headers=HEADERS, timeout=10)
        if r_vn30.status_code == 200:
            for item in r_vn30.json().get('data', []):
                vn30_stocks.append(clean_stock_item(item))
            print(f"✅ Đã tải thành công {len(vn30_stocks)} mã cổ phiếu VN30 từ SSI iBoard")
    except Exception as e:
        print(f"⚠️ Lỗi tải VN30: {e}")

    # 3. Fetch all HOSE (VN-Index)
    all_hose_stocks = []
    try:
        r_hose = requests.get('https://iboard-query.ssi.com.vn/stock/exchange/hose', headers=HEADERS, timeout=15)
        if r_hose.status_code == 200:
            for item in r_hose.json().get('data', []):
                all_hose_stocks.append(clean_stock_item(item))
            print(f"✅ Đã tải thành công {len(all_hose_stocks)} mã cổ phiếu HOSE (VN-Index) từ SSI iBoard")
    except Exception as e:
        print(f"⚠️ Lỗi tải HOSE: {e}")

    payload = {
        "indices": indices,
        "vn30": vn30_stocks,
        "all": all_hose_stocks,
        "sectors": SECTOR_MAPPING,
        "updated_at": requests.utils.default_user_agent()
    }

    out_file = os.path.join(output_dir, "stocks.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu dữ liệu bảng giá tại: {out_file}")

    # 4. Fetch Company Profiles for VN30 + Key symbols
    key_symbols = [s['symbol'] for s in vn30_stocks] or ["FPT", "HPG", "VCB", "SSI", "VND", "MWG", "TCB", "MBB", "VHM", "VIC"]
    profiles = fetch_company_profiles(key_symbols)
    with open(os.path.join(output_dir, "company_profiles.json"), "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)
    print(f"✅ Đã lưu hồ sơ doanh nghiệp cho {len(profiles)} mã cổ phiếu")
    
    return payload

if __name__ == "__main__":
    fetch_all_stocks()
