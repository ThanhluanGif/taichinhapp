import os
import json
import hashlib
from datetime import datetime
import requests
import feedparser
from dotenv import load_dotenv

from config import RSS_FEEDS
from categorizer import clean_html_and_extract_image, categorize_article

load_dotenv()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def generate_article_id(link: str, title: str) -> str:
    return hashlib.md5(f"{link}_{title}".encode('utf-8')).hexdigest()

def fetch_all_news():
    print("🚀 Bắt đầu quét tin tức từ các nguồn RSS...")
    articles = []
    seen_ids = set()

    for feed_info in RSS_FEEDS:
        url = feed_info["url"]
        source = feed_info["source"]
        default_cat = feed_info["default_category"]
        
        print(f"📡 Đang kết nối: {feed_info['name']} ({url})...")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 200:
                print(f"⚠️ Nguồn {url} trả về mã lỗi HTTP: {resp.status_code}")
                continue
                
            feed = feedparser.parse(resp.content)
            count = 0
            for entry in feed.entries[:20]:  # Take top 20 from each feed
                title = entry.get("title", "").strip()
                link = entry.get("link", "").strip()
                if not title or not link:
                    continue
                    
                article_id = generate_article_id(link, title)
                if article_id in seen_ids:
                    continue
                seen_ids.add(article_id)
                
                raw_summary = entry.get("summary", "") or entry.get("description", "")
                clean_summary, image_url = clean_html_and_extract_image(raw_summary)
                
                category = categorize_article(title, clean_summary, default_cat)
                
                # Check for image enclosure if bs4 didn't find one
                if not image_url and "enclosures" in entry and entry.enclosures:
                    for enc in entry.enclosures:
                        if enc.get("type", "").startswith("image/"):
                            image_url = enc.get("href", "")
                            break

                published = entry.get("published", "") or entry.get("updated", "") or entry.get("pubDate", "")
                
                articles.append({
                    "id": article_id,
                    "title": title,
                    "link": link,
                    "summary": clean_summary[:300] + "..." if len(clean_summary) > 300 else clean_summary,
                    "image": image_url,
                    "source": source,
                    "category": category, # MACRO, MARKET, ENTERPRISE
                    "published_at": published or datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "created_at": datetime.now().isoformat()
                })
                count += 1
            print(f"   -> Thu thập thành công {count} bài viết từ {source}")
        except Exception as e:
            print(f"⚠️ Lỗi khi cào dữ liệu từ {url}: {e}")

    print(f"\n🎉 TỔNG CỘNG: Thu thập thành công {len(articles)} bài viết mới nhất!")
    
    # Save to JSON storage inside public/data/news.json at root
    public_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../public/data"))
    os.makedirs(public_data_dir, exist_ok=True)
    json_path = os.path.join(public_data_dir, "news.json")
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu dữ liệu tại: {json_path}")

    # Also save to scraper/data/news.json
    scraper_data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(scraper_data_dir, exist_ok=True)
    with open(os.path.join(scraper_data_dir, "news.json"), "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)

    # Optional: Sync to Supabase if credentials exist
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            print("☁️ Đang đồng bộ dữ liệu lên Supabase...")
            supabase.table("news").upsert(articles).execute()
            print("✅ Đã cập nhật dữ liệu thành công lên Supabase Cloud!")
        except Exception as e:
            print(f"⚠️ Không thể kết nối Supabase: {e}")

    return articles

if __name__ == "__main__":
    fetch_all_news()
