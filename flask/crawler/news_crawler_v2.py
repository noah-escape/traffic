# SQLite_마이그레이션
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def get_article_date(detail_url):
    """
    상세 페이지에서 <meta property="article:published_time"> 태그에서 날짜 추출
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(detail_url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")

    meta_tag = soup.find("meta", attrs={"property": "article:published_time"})
    if meta_tag:
        iso_date = meta_tag.get("content")
        return iso_date[:10].replace("-", ".")
    return ""

def get_metro_news(url, category):
    headers = {"User-Agent": "Mozilla/5.0"}
    articles = []
    page = 1
    while True:
        paged_url = url + f"&page={page}"
        response = requests.get(paged_url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        rows = soup.select("div.boardList ul li")
        if not rows:
            break  # 더 이상 뉴스 없음(페이지 끝)

        for row in rows:
            link_tag = row.select_one("a")
            title_tag = row.select_one("div.boardListSubject")
            summary_tag = row.select_one("div.boardListContent")
            img_tag = row.select_one("div.boardListPhoto img")

            if link_tag and title_tag:
                title = title_tag.get_text(strip=True)
                summary = summary_tag.get_text(strip=True) if summary_tag else ""
                relative_link = link_tag.get("href")
                full_link = "http://metronews.co.kr" + relative_link

                date = get_article_date(full_link) or datetime.today().strftime("%Y.%m.%d")

                thumbnail = ""
                if img_tag and img_tag.get("src"):
                    thumbnail = "http://metronews.co.kr" + img_tag.get("src")

                articles.append({
                    "title": title,
                    "summary": summary,
                    "link": full_link,
                    "date": date,
                    "category": category,  # SQLite_마이그레이션 추가
                    "source": f"메트로뉴스 - {category}",
                    "thumbnail": thumbnail
                })
        page += 1  # 다음 페이지로
    return articles

def get_all_news():
    all_articles = []

    metro_urls = {
        "지하철": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=지하철",
        "택시": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=택시조합",
        "교통정책": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=교통정책",
        # SQLite_마이그레이션_6개 카테고리 추가
        "철도": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=철도",
        "오피니언": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=오피니언",
        "정치/ 경제 /노사": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=정치/ 경제 /노사",
        "인사동정": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=인사동정",
        "보건환경": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=보건환경",
        "시민신문고": "http://metronews.co.kr/board_list.html?board_id=news&ca_name=시민신문고"
    }

    for category, url in metro_urls.items():
        all_articles.extend(get_metro_news(url, category))

    try:
        all_articles.sort(key=lambda x: datetime.strptime(x['date'], "%Y.%m.%d"), reverse=True)
    except Exception as e:
        print("정렬 에러:", e)

    return all_articles

def get_popular_news():
    """
    메트로뉴스 '가장 많이 본 뉴스' 영역 크롤링
    """
    url = "http://metronews.co.kr/board_list.html?board_id=news&ca_name=지하철"
    headers = {"User-Agent": "Mozilla/5.0"}
    res = requests.get(url, headers=headers)
    soup = BeautifulSoup(res.text, "html.parser")

    popular_articles = []
    # ✅ 확인된 인기기사 위치
    items = soup.select("div.favoriteNewsBody ul li")

    for item in items:
        link_tag = item.select_one("a")
        if not link_tag:
            continue

        relative_link = link_tag.get("href")
        title = link_tag.get_text(strip=True)
        full_link = "http://metronews.co.kr" + relative_link

        date = get_article_date(full_link) or datetime.today().strftime("%Y.%m.%d")

        popular_articles.append({
            "title": title,
            "link": full_link,
            "date": date,
            "source": "메트로뉴스 - 인기기사",
            "summary": "",
            "thumbnail": ""
        })

    return popular_articles[:5]

# 테스트 실행
if __name__ == "__main__":
    from pprint import pprint
    print("✅ 최신 기사:")
    pprint(get_all_news())
    print("\n🔥 인기 기사:")
    pprint(get_popular_news())
