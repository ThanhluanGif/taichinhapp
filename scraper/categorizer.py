import re
from bs4 import BeautifulSoup
from config import KEYWORD_RULES

def clean_html_and_extract_image(raw_html: str):
    """
    Extracts text description and thumbnail image URL from RSS summary HTML.
    """
    if not raw_html:
        return "", ""
    
    soup = BeautifulSoup(raw_html, "html.parser")
    
    # Extract image src
    img_tag = soup.find("img")
    image_url = ""
    if img_tag and img_tag.get("src"):
        image_url = img_tag["src"]
        
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.extract()
        
    # Get clean text
    clean_text = soup.get_text(separator=" ").strip()
    # Normalize whitespaces
    clean_text = re.sub(r'\s+', ' ', clean_text)
    
    return clean_text, image_url

def categorize_article(title: str, summary: str, default_category: str = "MACRO") -> str:
    """
    Categorizes article based on keyword matching in title and summary.
    Returns: 'MACRO', 'MARKET', or 'ENTERPRISE'
    """
    combined_text = f"{title} {summary}".lower()
    
    scores = {
        "MACRO": 0,
        "MARKET": 0,
        "ENTERPRISE": 0
    }
    
    for category, keywords in KEYWORD_RULES.items():
        for kw in keywords:
            # Give higher weight to title matches
            if kw in title.lower():
                scores[category] += 3
            elif kw in combined_text:
                scores[category] += 1
                
    # If a category has high score, return it
    max_cat = max(scores, key=scores.get)
    if scores[max_cat] > 0:
        return max_cat
        
    # Fallback to feed default category
    return default_category if default_category in scores else "MACRO"
