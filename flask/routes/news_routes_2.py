# SQLite_마이그레이션

from flask import Blueprint, render_template, request
import sqlite3
from crawler.news_crawler_v2 import get_popular_news

bp = Blueprint("news_v2", __name__)

@bp.route("/news_v2")
def news_page_v2():
    # 1. DB 연결
    conn = sqlite3.connect("news.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 2. 카테고리 및 페이지 번호 파라미터
    category = request.args.get("category", "전체")
    page = int(request.args.get("page", 1))
    per_page = 7
    offset = (page - 1) * per_page

    # 3. 카테고리별 데이터 SELECT
    if category != "전체":
        cursor.execute(
            "SELECT * FROM news_articles WHERE category = ? ORDER BY date DESC LIMIT ? OFFSET ?",
            (category, per_page, offset)
        )
        articles = [dict(a) for a in cursor.fetchall()]
        total = cursor.execute(
            "SELECT COUNT(*) FROM news_articles WHERE category = ?", (category,)
        ).fetchone()[0]
    else:
        cursor.execute(
            "SELECT * FROM news_articles ORDER BY date DESC LIMIT ? OFFSET ?",
            (per_page, offset)
        )
        articles = [dict(a) for a in cursor.fetchall()]
        total = cursor.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]

    conn.close()

    total_pages = (total + per_page - 1) // per_page

    # 4. 실시간 속보 Ticker (상위 10개 내 키워드 포함 기사)
    keywords = ["속보", "긴급", "파업", "지연", "지하철", "사고", "정전", "무정차"]
    ticker = []
    for a in articles[:10]:
        try:
            if any(k in a["title"] for k in keywords):
                ticker.append(a["title"])
        except Exception as e:
            print("[ticker에러]", e)
        if len(ticker) >= 5:
            break

    # 5. 인기기사 (실시간 크롤러)
    try:
        popular_articles = get_popular_news()
    except Exception as e:
        print("🔥 인기기사 오류:", e)
        popular_articles = []

    # 6. DEBUG 출력 (필요 없으면 주석처리)
    print(f"[DEBUG] category: {category} | page: {page} | total: {total} | total_pages: {total_pages} | articles: {len(articles)}")
    if articles:
        print("[DEBUG] 첫 번째 기사:", articles[0])
    else:
        print("[DEBUG] ❌ 기사 없음 (DB/쿼리/카테고리 확인 필요)")

    # 7. 페이지 렌더
    return render_template(
        "news_v2.html",
        articles=articles,
        selected=category,
        ticker=ticker,
        popular_articles=popular_articles,
        page=page,
        total_pages=total_pages
    )


#@bp.route("/news_v2/stats")
#def news_stats():
#    return "<h1>📊 통계 대시보드 페이지 준비 중</h1>"
