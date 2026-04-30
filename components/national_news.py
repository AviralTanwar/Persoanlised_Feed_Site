import hashlib
import os

import requests
import streamlit as st
from dotenv import load_dotenv

from utils.database import get_interaction, toggle_interaction

load_dotenv()


def _article_id(article: dict) -> str:
    key = article.get("url") or article.get("title") or ""
    return hashlib.md5(key.encode()).hexdigest()[:12]


@st.cache_data(ttl=1800)
def _fetch(country: str, page_size: int) -> dict:
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return {"error": "NEWS_API_KEY not set in .env"}
    try:
        resp = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={"country": country, "pageSize": page_size, "apiKey": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": str(e)}


def render_national_news(config: dict):
    country = config.get("country", "in")
    page_size = config.get("page_size", 6)

    st.markdown("### 📰 National News")

    data = _fetch(country, page_size)

    if "error" in data:
        st.error(f"News unavailable: {data['error']}")
        st.caption("Set `NEWS_API_KEY` in your `.env` file.")
        return

    articles = [a for a in data.get("articles", []) if a.get("title") and "[Removed]" not in a["title"]]

    if not articles:
        st.info("No articles available right now.")
        return

    for i, article in enumerate(articles):
        art_id = _article_id(article)
        current = get_interaction(art_id, "national_news")
        title = article.get("title", "Untitled")
        url = article.get("url", "#")
        source = article.get("source", {}).get("name", "Unknown")
        desc = article.get("description", "")

        with st.container():
            c_text, c_act = st.columns([4, 1])
            with c_text:
                st.markdown(f"**[{title}]({url})**")
                st.caption(source)
                if desc:
                    st.caption((desc[:140] + "…") if len(desc) > 140 else desc)
            with c_act:
                if st.button("👍", key=f"ln_{art_id}",
                             type="primary" if current == "like" else "secondary",
                             use_container_width=True):
                    toggle_interaction(art_id, "national_news", "like", title, url)
                    st.rerun()
                if st.button("👎", key=f"dn_{art_id}",
                             type="primary" if current == "dislike" else "secondary",
                             use_container_width=True):
                    toggle_interaction(art_id, "national_news", "dislike", title, url)
                    st.rerun()
                st.link_button("🔗", url, use_container_width=True, help="Open article")

        if i < len(articles) - 1:
            st.divider()

    if st.button("🔄 Refresh News", key="national_news_refresh"):
        _fetch.clear()
        st.rerun()
