import sqlite3
conn = sqlite3.connect('news.db')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM news_articles WHERE category='뭔데'")
print(cur.fetchone())
conn.close()