"""
Configuration for economic news RSS feeds & categorization keywords.
"""

RSS_FEEDS = [
    # VnExpress
    {
        "name": "VnExpress - Kinh doanh",
        "url": "https://vnexpress.net/rss/kinh-doanh.rss",
        "default_category": "MACRO",
        "source": "VnExpress"
    },
    {
        "name": "VnExpress - Bất động sản",
        "url": "https://vnexpress.net/rss/bat-dong-san.rss",
        "default_category": "MARKET",
        "source": "VnExpress"
    },

    # Tuổi Trẻ
    {
        "name": "Tuổi Trẻ - Kinh doanh",
        "url": "https://tuoitre.vn/rss/kinh-doanh.rss",
        "default_category": "MARKET",
        "source": "Tuổi Trẻ"
    },

    # Báo Thanh Niên
    {
        "name": "Thanh Niên - Kinh tế",
        "url": "https://thanhnien.vn/rss/kinh-te.rss",
        "default_category": "MACRO",
        "source": "Thanh Niên"
    },

    # Báo Đầu Tư
    {
        "name": "Báo Đầu Tư - Tài chính Ngân hàng",
        "url": "https://baodautu.vn/rss/tai-chinh-ngan-hang.rss",
        "default_category": "MACRO",
        "source": "Báo Đầu Tư"
    },
    {
        "name": "Báo Đầu Tư - Chứng khoán",
        "url": "https://baodautu.vn/rss/chungkhoan.rss",
        "default_category": "MARKET",
        "source": "Báo Đầu Tư"
    },
    {
        "name": "Báo Đầu Tư - Doanh nghiệp",
        "url": "https://baodautu.vn/rss/doanh-nghiep.rss",
        "default_category": "ENTERPRISE",
        "source": "Báo Đầu Tư"
    },

    # VietNamNet
    {
        "name": "VietNamNet - Kinh doanh",
        "url": "https://vietnamnet.vn/rss/kinh-doanh.rss",
        "default_category": "MACRO",
        "source": "VietNamNet"
    }
]

KEYWORD_RULES = {
    "MACRO": [
        "lãi suất", "ngân hàng nhà nước", "nhnn", "cpi", "lạm phát", "tỷ giá", "usd", "vnd", "fed",
        "gdp", "bộ tài chính", "nghị định", "chính sách tài khóa", "omo", "dxy", "tăng trưởng",
        "xuất nhập khẩu", "fdi", "tín dụng", "nợ công", "vĩ mô", "chính sách", "ngân sách", "chính phủ"
    ],
    "MARKET": [
        "vn-index", "vnindex", "hnx", "upcom", "chứng khoán", "khối ngoại", "bất động sản",
        "dầu khí", "ngân hàng", "thép", "tự doanh", "etf", "thị trường", "phiên giao dịch",
        "thanh khoản", "dòng tiền", "nhà đầu tư", "chỉ số", "giá vàng", "chung cư", "đất nền"
    ],
    "ENTERPRISE": [
        "báo cáo tài chính", "bctc", "lợi nhuận", "đại hội cổ đông", "đhđcđ", "cổ tức",
        "phát hành", "doanh thu", "m&a", "chủ tịch", "tổng giám đốc", "tăng vốn",
        "hđqt", "cổ phiếu", "mã", "thâu tóm", "sáp nhập", "kế hoạch kinh doanh", "tesla", "fpt"
    ]
}
