import requests
import streamlit as st

from utils.database import get_interaction, toggle_interaction

_SCORE_COLOR = {
    0:   "#45475a",   # < 100
    100: "#89b4fa",   # 100–299
    300: "#fab387",   # 300–599
    600: "#f38ba8",   # 600+
}


def _score_color(score: int) -> str:
    for threshold in sorted(_SCORE_COLOR.keys(), reverse=True):
        if score >= threshold:
            return _SCORE_COLOR[threshold]
    return _SCORE_COLOR[0]


@st.cache_data(ttl=1800, show_spinner="Loading tech news…")
def _fetch_hn(count: int = 12) -> list[dict]:
    try:
        ids = requests.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json", timeout=10
        ).json()[:count * 4]          # fetch extra to account for non-story items

        stories = []
        for sid in ids:
            if len(stories) >= count:
                break
            item = requests.get(
                f"https://hacker-news.firebaseio.com/v0/item/{sid}.json", timeout=5
            ).json()
            if item and item.get("type") == "story" and item.get("title"):
                stories.append(item)
        return stories
    except Exception:
        return []


def _domain(url: str) -> str:
    try:
        host = url.split("//", 1)[1].split("/")[0]
        return host.replace("www.", "")
    except Exception:
        return ""


def render_tech_news():
    st.markdown("### 💻 Tech News")

    stories = _fetch_hn(12)

    if not stories:
        st.error("Could not load tech news — check your connection.")
        return

    for i, story in enumerate(stories):
        sid = str(story["id"])
        title = story.get("title", "Untitled")
        url = story.get("url") or f"https://news.ycombinator.com/item?id={sid}"
        discuss_url = f"https://news.ycombinator.com/item?id={sid}"
        score = story.get("score", 0)
        by = story.get("by", "unknown")
        comments = story.get("descendants", 0)
        domain = _domain(url) if story.get("url") else "news.ycombinator.com"
        current = get_interaction(sid, "tech_news")

        c_main, c_acts = st.columns([5, 1])

        with c_main:
            score_col = _score_color(score)
            st.markdown(
                f"<span style='background:{score_col};color:#11111b;font-size:11px;"
                f"font-weight:700;padding:2px 7px;border-radius:10px;margin-right:6px'>"
                f"▲ {score}</span>"
                f"**[{title}]({url})**",
                unsafe_allow_html=True,
            )
            meta = f"<span style='color:#6c7086;font-size:11px'>"
            meta += f"by {by}"
            if comments:
                meta += f" &nbsp;·&nbsp; <a href='{discuss_url}' target='_blank' "
                meta += f"style='color:#6c7086;text-decoration:none'>💬 {comments}</a>"
            if domain:
                meta += f" &nbsp;·&nbsp; {domain}"
            meta += "</span>"
            st.markdown(meta, unsafe_allow_html=True)

        with c_acts:
            liked = current == "like"
            disliked = current == "dislike"
            c1, c2, c3 = st.columns(3)
            with c1:
                if st.button("👍" if not liked else "💙",
                             key=f"lt_{sid}",
                             help="Like",
                             use_container_width=True):
                    toggle_interaction(sid, "tech_news", "like", title, url)
                    st.rerun()
            with c2:
                if st.button("👎" if not disliked else "❌",
                             key=f"dt_{sid}",
                             help="Dislike",
                             use_container_width=True):
                    toggle_interaction(sid, "tech_news", "dislike", title, url)
                    st.rerun()
            with c3:
                st.link_button("🔗", url, help="Open article", use_container_width=True)

        if i < len(stories) - 1:
            st.markdown("<hr style='border:none;border-top:1px solid #1e1e2e;margin:6px 0'>",
                        unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    c1, c2 = st.columns(2)
    with c1:
        if st.button("🔄 Refresh", key="tech_refresh", use_container_width=True):
            _fetch_hn.clear()
            st.rerun()
    with c2:
        st.link_button("🌐 Hacker News", "https://news.ycombinator.com",
                       use_container_width=True)
