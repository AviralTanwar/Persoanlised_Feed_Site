import json
import os
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

load_dotenv()


def _load_config() -> dict:
    p = Path("static/onenote_pages.json")
    return json.loads(p.read_text()) if p.exists() else {"pages": []}


def render_onenote(_config: dict):
    st.markdown("### 📓 OneNote")

    try:
        import msal  # noqa: F401
        has_msal = True
    except ImportError:
        has_msal = False

    client_id = os.getenv("MS_CLIENT_ID")

    if not has_msal or not client_id:
        st.info("OneNote requires a one-time Microsoft login setup.")
        with st.expander("📋 Setup steps"):
            st.markdown("""
**1. Create an Azure App Registration**
- Go to [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App registrations
- New registration → any name → **Accounts in any org + personal Microsoft accounts**
- Under *API permissions* add **Microsoft Graph → Delegated → Notes.ReadWrite**

**2. Add to `.env`**
```
MS_CLIENT_ID=<Application (client) ID>
MS_TENANT_ID=common
```

**3. Add page IDs to `static/onenote_pages.json`**
```json
{ "pages": [{ "title": "My Page", "page_id": "YOUR-PAGE-ID" }] }
```
Page IDs are found via: Graph Explorer → `GET /me/onenote/pages`
            """)
        return

    cfg = _load_config()
    pages = cfg.get("pages", [])

    if "ms_token" not in st.session_state:
        if st.button("🔐 Connect to OneNote", key="on_connect"):
            _do_device_auth(client_id)
        return

    if not pages:
        st.info("Add page entries to `static/onenote_pages.json`.")
        return

    _render_pages(pages, st.session_state.ms_token)


def _do_device_auth(client_id: str):
    import msal

    tenant = os.getenv("MS_TENANT_ID", "common")
    app = msal.PublicClientApplication(
        client_id, authority=f"https://login.microsoftonline.com/{tenant}"
    )
    flow = app.initiate_device_flow(scopes=["Notes.ReadWrite"])
    if "user_code" not in flow:
        st.error("Could not start auth flow.")
        return

    st.session_state["_ms_flow"] = flow
    st.session_state["_ms_app"] = app
    st.info(
        f"Go to **{flow['verification_uri']}** and enter code **`{flow['user_code']}`**"
    )

    if st.button("✅ I've entered the code", key="on_code_done"):
        result = app.acquire_token_by_device_flow(flow)
        if "access_token" in result:
            st.session_state["ms_token"] = result["access_token"]
            st.session_state.pop("_ms_flow", None)
            st.session_state.pop("_ms_app", None)
            st.success("Connected!")
            st.rerun()
        else:
            st.error(f"Auth failed: {result.get('error_description', 'Unknown')}")


def _render_pages(pages: list, token: str):
    import requests

    titles = [p.get("title", f"Page {i+1}") for i, p in enumerate(pages)]
    idx = st.selectbox("Page", range(len(titles)), format_func=lambda i: titles[i], key="on_select")
    page_id = pages[idx].get("page_id", "")

    if not page_id:
        st.warning("No `page_id` configured for this entry.")
        return

    @st.cache_data(ttl=300, show_spinner="Loading page…")
    def _get_page(pid: str, tok: str) -> str:
        resp = requests.get(
            f"https://graph.microsoft.com/v1.0/me/onenote/pages/{pid}/content",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        if resp.ok:
            return resp.text
        return f"<p style='color:red'>Error {resp.status_code}: {resp.text[:200]}</p>"

    html = _get_page(page_id, token)
    components.html(
        f"""<div style="font-family:-apple-system,sans-serif;padding:10px;
        color:#333;background:#fff;border-radius:8px;">{html}</div>""",
        height=420,
        scrolling=True,
    )

    c1, c2, c3 = st.columns(3)
    with c1:
        st.link_button("🌐 Open OneNote", "https://www.onenote.com", use_container_width=True)
    with c2:
        if st.button("🔄 Refresh", key="on_refresh"):
            _get_page.clear()
            st.rerun()
    with c3:
        if st.button("🔒 Disconnect", key="on_disconnect"):
            del st.session_state["ms_token"]
            st.rerun()
