"""
Fetches real-time stock quotes from SSI iBoard for VN30 and HOSE (VN-Index)
"""

import os
import json
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

def fetch_all_stocks():
    print("🚀 Bắt đầu lấy dữ liệu bảng giá SSI iBoard (VN-Index & VN30)...")
    
    # 1. Fetch VN30
    vn30_stocks = []
    try:
        r_vn30 = requests.get('https://iboard-query.ssi.com.vn/stock/group/VN30', headers=HEADERS, timeout=10)
        if r_vn30.status_code == 200:
            for item in r_vn30.json().get('data', []):
                vn30_stocks.append(clean_stock_item(item))
            print(f"✅ Đã tải thành công {len(vn30_stocks)} mã cổ phiếu VN30 từ SSI iBoard")
    except Exception as e:
        print(f"⚠️ Lỗi tải VN30: {e}")

    # 2. Fetch all HOSE (VN-Index)
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
        "vn30": vn30_stocks,
        "all": all_hose_stocks,
        "sectors": SECTOR_MAPPING,
        "updated_at": requests.utils.default_user_agent()
    }

    # Save to public/data/stocks.json
    output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/data"))
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, "stocks.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu dữ liệu bảng giá tại: {out_file}")
    
    return payload

if __name__ == "__main__":
    fetch_all_stocks()
