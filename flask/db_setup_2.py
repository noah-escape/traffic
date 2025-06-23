# SQLite_마이그레이션
import os
import sqlite3

DB_PATH = "news.db"

# 1. 기존 DB파일 삭제
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
    print("🧹 DB 삭제 완료!")

# 2. 새로 테이블 생성
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS news_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        summary TEXT,
        link TEXT UNIQUE,
        date TEXT,
        category TEXT,
        source TEXT,
        thumbnail TEXT
    );
    """)
    conn.commit()
    conn.close()
    print("✅ DB 생성 완료")

if __name__ == "__main__":
    init_db()
