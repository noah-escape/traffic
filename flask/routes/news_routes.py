from flask import Blueprint, render_template, request
from crawler.news_crawler import get_all_news

bp = Blueprint("news", __name__)

@bp.route("/news")
def news_page():
    category_filter = request.args.get("category")
    articles = get_all_news()

    if category_filter and category_filter != "전체":
        articles = [a for a in articles if category_filter in a["source"]]

    return render_template("news.html", articles=articles, selected=category_filter or "전체")
