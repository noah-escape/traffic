# SQLite_마이그레이션
import sqlite3
from datetime import datetime
from crawler.news_crawler_v2 import get_all_news
from apscheduler.schedulers.blocking import BlockingScheduler

def to_datetime_str(date_str):
    try:
        if '.' in date_str and len(date_str) == 10:
            dt = datetime.strptime(date_str, "%Y.%m.%d")
            return dt.strftime("%Y-%m-%d 00:00:00")
        elif '-' in date_str and len(date_str) == 10:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%Y-%m-%d 00:00:00")
        elif len(date_str) > 10:  # 시간까지 있음
            try:
                dt = datetime.strptime(date_str, "%Y.%m.%d %H:%M:%S")
            except:
                dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        else:
            return date_str
    except Exception:
        return date_str

def save_articles_to_db():
    conn = sqlite3.connect("news.db")
    cursor = conn.cursor()

    articles = get_all_news()

    for article in articles:
        try:
            date_val = to_datetime_str(article["date"])
            cursor.execute("""
            INSERT OR IGNORE INTO news_articles
            (title, summary, link, date, category, source, thumbnail)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                article["title"],
                article["summary"],
                article["link"],
                date_val,
                article["category"],
                article["source"],
                article["thumbnail"]
            ))
        except Exception as e:
            print("❌ 저장 실패:", e)

    conn.commit()
    conn.close()
    print(f"✅ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 뉴스 저장 완료")

def scheduled_job():
    print("🕑 [Scheduler] 뉴스 저장 시작")
    save_articles_to_db()
    print("🕑 [Scheduler] 작업 완료\n")

if __name__ == "__main__":
    print("🟢 자동 뉴스 크롤러(10분마다) 실행 시작")
    scheduler = BlockingScheduler()
    scheduler.add_job(scheduled_job, "interval", minutes=10, id="news_job")
    scheduled_job()
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("⛔ 스케줄러 종료")
