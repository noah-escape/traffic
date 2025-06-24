# SQLite_마이그레이션

from flask import Blueprint, render_template, request
import sqlite3
from crawler.news_crawler_v2 import get_popular_news

bp = Blueprint("news_v2", __name__)

@bp.route("/news_v2")
def news_page_v2():
    conn = sqlite3.connect("news.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    category = request.args.get("category", "전체")
    page = int(request.args.get("page", 1))
    per_page = 7
    offset = (page - 1) * per_page

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

    try:
        popular_articles = get_popular_news()
    except Exception as e:
        print("🔥 인기기사 오류:", e)
        popular_articles = []

    return render_template(
        "news_v2.html",
        articles=articles,
        selected=category,
        ticker=ticker,
        popular_articles=popular_articles,
        page=page,
        total_pages=total_pages
    )

@bp.route("/news_v2/search")
def news_search_v2():
    conn = sqlite3.connect("news.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    q = request.args.get("q", "").strip()
    field = request.args.get("field", "all")
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")
    category = request.args.get("category", "전체")
    page = int(request.args.get("page", 1))
    per_page = 7
    offset = (page - 1) * per_page

    query = "SELECT * FROM news_articles WHERE 1=1"
    count_query = "SELECT COUNT(*) FROM news_articles WHERE 1=1"
    params, count_params = [], []

    if category != "전체":
        query += " AND category = ?"
        count_query += " AND category = ?"
        params.append(category)
        count_params.append(category)

    if q:
        if field == "title":
            query += " AND title LIKE ?"
            count_query += " AND title LIKE ?"
            params.append(f"%{q}%")
            count_params.append(f"%{q}%")
        elif field == "summary":
            query += " AND summary LIKE ?"
            count_query += " AND summary LIKE ?"
            params.append(f"%{q}%")
            count_params.append(f"%{q}%")
        else:
            query += " AND (title LIKE ? OR summary LIKE ?)"
            count_query += " AND (title LIKE ? OR summary LIKE ?)"
            params += [f"%{q}%", f"%{q}%"]
            count_params += [f"%{q}%", f"%{q}%"]

    if start_date:
        query += " AND date >= ?"
        count_query += " AND date >= ?"
        params.append(start_date)
        count_params.append(start_date)
    if end_date:
        end_date_ext = end_date
        if len(end_date) == 10:
            end_date_ext = end_date + " 23:59:59"
        query += " AND date <= ?"
        count_query += " AND date <= ?"
        params.append(end_date_ext)
        count_params.append(end_date_ext)

    query += " ORDER BY date DESC LIMIT ? OFFSET ?"
    params += [per_page, offset]

    cursor.execute(query, tuple(params))
    articles = [dict(a) for a in cursor.fetchall()]
    total = cursor.execute(count_query, tuple(count_params)).fetchone()[0]
    total_pages = (total + per_page - 1) // per_page
    conn.close()

    return render_template(
        "news_v2_search.html",
        articles=articles,
        q=q,
        field=field,
        start_date=start_date,
        end_date=end_date,
        category=category,
        page=page,
        total_pages=total_pages,
        total=total
    )

#@bp.route("/news_v2/stats")
#def news_stats():
#    return "<h1>📊 통계 대시보드 페이지 준비 중</h1>"
