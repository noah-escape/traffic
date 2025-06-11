import os
from dotenv import load_dotenv
from pathlib import Path
import pymysql
import feedparser
from datetime import datetime

# ✅ 환경변수 로드
env_path = Path(__file__).resolve().parents[2] / ".env"
print("🧪 로딩하려는 .env 경로:", env_path)
print("🧪 실제 존재 여부:", env_path.exists())

load_dotenv(dotenv_path=env_path)
print("DB_USER:", repr(os.getenv("DB_USER")))
print("DB_PASS:", repr(os.getenv("DB_PASS")))

# ✅ DB 연결
db = pymysql.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASS"),
    database=os.getenv("DB_NAME"),
    charset='utf8mb4'
)
cursor = db.cursor()

# ✅ RSS 기반 뉴스 크롤러
def crawl_weather_rss():
    rss_url = "https://news.google.com/rss/search?q=날씨&hl=ko&gl=KR&ceid=KR:ko"
    print("🌤️ RSS 기반 날씨 뉴스 크롤러 실행!")
    print("🔗 RSS URL:", rss_url)

    feed = feedparser.parse(rss_url)

    for entry in feed.entries:
        title = entry.title
        url = entry.link
        snippet = entry.get("summary", "")
        pub_date = datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") else datetime.now()

        try:
            cursor.execute("""
                INSERT IGNORE INTO weather_articles (title, url, snippet, published_at)
                VALUES (%s, %s, %s, %s)
            """, (title, url, snippet, pub_date))
            db.commit()
            print("✅ 저장됨:", title)
        except Exception as e:
            print("❌ 저장 실패:", e)

# ✅ 실행
if __name__ == "__main__":
    crawl_weather_rss()
