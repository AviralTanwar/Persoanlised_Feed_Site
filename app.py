import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

from utils.database import init_db
from components.weather import render_weather
from components.national_news import render_national_news
from components.tech_news import render_tech_news
from components.onenote import render_onenote
from components.youtube_viewer import render_youtube
from components.webpage_viewer import render_webpage
from components.improvements import render_improvements

load_dotenv()
init_db()

st.set_page_config(
    page_title="API Explorer Dashboard",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
/* View-transition animations */
::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){
  animation-duration:.25s;
  animation-timing-function:cubic-bezier(.19,1,.22,1);
}

/* App background */
[data-testid="stAppViewContainer"]{background:#11111b}
[data-testid="stHeader"]{background:transparent}
[data-testid="stSidebar"]{background:#181825}

/* Section wrapper */
.widget-box{
  background:#1e1e2e;
  border:1px solid #313244;
  border-radius:14px;
  padding:1.2rem 1.4rem;
  margin-bottom:.75rem;
}

/* Headings */
h3{color:#cdd6f4;border-bottom:1px solid #313244;padding-bottom:.45rem;margin-bottom:.9rem}

/* Streamlit button overrides */
.stButton>button[kind="primary"]{background:#89b4fa;color:#11111b;border:none}
.stButton>button[kind="secondary"]{background:transparent;border:1px solid #45475a;color:#cdd6f4}
.stButton>button[kind="secondary"]:hover{border-color:#89b4fa;color:#89b4fa}

/* Link buttons */
.stLinkButton a{font-size:12px}

/* Divider */
hr{border-color:#313244}

/* Scrollbars */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:#1e1e2e}
::-webkit-scrollbar-thumb{background:#45475a;border-radius:3px}

/* Textarea glow on focus */
textarea:focus{
  border-color:#89b4fa !important;
  box-shadow:0 0 0 2px rgba(137,180,250,.25) !important;
  transition:box-shadow .2s ease,border-color .2s ease;
}
textarea{transition:border-color .2s ease;}

/* Input fields */
input[type="text"]:focus{
  border-color:#89b4fa !important;
  box-shadow:0 0 0 2px rgba(137,180,250,.2) !important;
}

/* Primary button pulse on hover */
.stButton>button[kind="primary"]:hover{
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(137,180,250,.35);
  transition:all .15s ease;
}
.stButton>button{transition:all .15s ease;}

/* Toast */
[data-testid="stToast"]{background:#1e1e2e;border:1px solid #313244;color:#cdd6f4;}
</style>
""", unsafe_allow_html=True)


@st.cache_data(ttl=3600)
def _load_config() -> dict:
    p = Path("static/config.json")
    return json.loads(p.read_text()) if p.exists() else {}


cfg = _load_config()

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("""
<div style="background:linear-gradient(135deg,#1e1e2e,#181825);
     border:1px solid #313244;border-radius:14px;
     padding:1.4rem 2rem;margin-bottom:1.2rem">
  <h1 style="margin:0;color:#89b4fa;font-size:1.9rem">🚀 API Explorer Dashboard</h1>
  <p style="margin:.3rem 0 0;color:#6c7086;font-size:.9rem">
    Your personalised window to the world
  </p>
</div>
""", unsafe_allow_html=True)

# ── Row 1: Weather | National News ───────────────────────────────────────────
col1, col2 = st.columns([1, 2], gap="medium")
with col1:
    with st.container(border=True):
        render_weather(cfg.get("weather", {}))
with col2:
    with st.container(border=True):
        render_national_news(cfg.get("news", {}))

# ── Row 2: Tech News | OneNote ───────────────────────────────────────────────
col3, col4 = st.columns(2, gap="medium")
with col3:
    with st.container(border=True):
        render_tech_news()
with col4:
    with st.container(border=True):
        render_onenote(cfg.get("onenote", {}))

# ── Row 3: YouTube Viewer ─────────────────────────────────────────────────────
with st.container(border=True):
    render_youtube()

# ── Row 4: Web Page Viewer ────────────────────────────────────────────────────
with st.container(border=True):
    render_webpage()

# ── Row 5: Improvements ───────────────────────────────────────────────────────
with st.container(border=True):
    render_improvements()

# ── Global Ctrl+Enter handler (covers every st.form textarea on the page) ────
components.html("""<script>
(function(){
  function wire(ta){
    if(ta._ce)return; ta._ce=true;
    ta.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){
        e.preventDefault();
        var el=ta;
        while(el=el.parentElement){
          if((el.getAttribute('data-testid')||'')==='stForm'){
            var btns=el.querySelectorAll('button');
            if(btns.length)
              btns[btns.length-1].dispatchEvent(
                new MouseEvent('click',{bubbles:true,cancelable:true})
              );
            return;
          }
        }
      }
    });
  }
  try{
    var doc=window.parent.document;
    doc.querySelectorAll('textarea').forEach(wire);
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){
          if(!n.querySelectorAll)return;
          n.querySelectorAll('textarea').forEach(wire);
          if(n.tagName==='TEXTAREA')wire(n);
        });
      });
    }).observe(doc.body,{childList:true,subtree:true});
  }catch(e){}
})();
</script>""", height=0)
