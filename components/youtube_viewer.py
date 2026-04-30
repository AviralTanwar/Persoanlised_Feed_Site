import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from utils.database import delete_note, get_notes, save_note

_NOTE_COLORS = ["#89b4fa", "#a6e3a1", "#fab387", "#f38ba8", "#cba6f7", "#89dceb"]


def _load_videos() -> list[dict]:
    p = Path("static/youtube_videos.json")
    return json.loads(p.read_text()) if p.exists() else []


def _video_id(url: str) -> str:
    if "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    return url


def render_youtube():
    st.markdown("### 🎬 YouTube Viewer")

    videos = _load_videos()
    if not videos:
        st.info("Add entries to `static/youtube_videos.json` to get started.")
        with st.expander("Format"):
            st.json([{"title": "Title", "url": "https://youtu.be/VIDEO_ID"}])
        return

    titles = [v.get("title", f"Video {i+1}") for i, v in enumerate(videos)]
    c_sel, c_link = st.columns([5, 1])
    with c_sel:
        idx = st.selectbox("Select video", range(len(titles)),
                           format_func=lambda i: titles[i], key="yt_select")
    video   = videos[idx]
    vid_id  = _video_id(video.get("url", ""))
    title   = video.get("title", "Video")

    with c_link:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        if video.get("url"):
            st.link_button("▶ YouTube", video["url"], use_container_width=True)

    # ── Load notes ─────────────────────────────────────────────────────────
    existing = get_notes(vid_id, "youtube")
    notes_js  = json.dumps([
        {"content": n["content"],
         "time":    n["created_at"][:16],
         "color":   _NOTE_COLORS[i % len(_NOTE_COLORS)]}
        for i, n in enumerate(reversed(existing))   # newest first
    ])
    count     = len(existing)
    title_esc = title.replace("'", "\\'").replace('"', '\\"')[:38]

    # ── YouTube iframe + draggable notes panel ──────────────────────────────
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:transparent;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}}
#wrap{{position:relative;width:100%;height:400px}}
iframe{{width:100%;height:400px;border:none;border-radius:10px;display:block}}

/* Floating panel */
#panel{{
  position:absolute;top:14px;right:14px;width:260px;
  background:rgba(17,17,27,.97);
  border:1px solid #89b4fa;border-radius:14px;
  z-index:50;box-shadow:0 8px 32px rgba(0,0,0,.7);
  display:flex;flex-direction:column;
  max-height:370px;overflow:hidden;
  transition:max-height .3s cubic-bezier(.19,1,.22,1),
             opacity .2s ease;
}}
.ph{{
  display:flex;justify-content:space-between;align-items:center;
  padding:10px 12px 8px;cursor:move;user-select:none;
  border-bottom:1px solid rgba(137,180,250,.2);flex-shrink:0;
}}
.ph-left{{display:flex;align-items:center;gap:6px}}
.ph-title{{color:#89b4fa;font-size:12px;font-weight:600;
  max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.badge{{background:#89b4fa;color:#11111b;font-size:10px;font-weight:700;
  padding:1px 6px;border-radius:8px;min-width:18px;text-align:center}}
.tb{{background:none;border:none;color:#6c7086;font-size:18px;
  cursor:pointer;padding:0;line-height:1;flex-shrink:0}}
.tb:hover{{color:#89b4fa}}

/* Notes list */
#notes-body{{overflow-y:auto;flex:1;padding:6px 10px}}
.ni{{
  border-left:3px solid #89b4fa;border-radius:0 8px 8px 0;
  background:rgba(255,255,255,.04);padding:8px 10px;margin:5px 0;
  font-size:12px;color:#cdd6f4;animation:slide-in .25s ease;
}}
.nt{{font-size:10px;color:#6c7086;margin-top:4px}}
.em{{color:#585b70;font-size:11px;text-align:center;padding:18px 0}}
@keyframes slide-in{{from{{opacity:0;transform:translateX(8px)}}to{{opacity:1;transform:none}}}}
</style></head><body>
<div id="wrap">
  <iframe src="https://www.youtube.com/embed/{vid_id}?rel=0"
          allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope"
          allowfullscreen></iframe>
  <div id="panel">
    <div class="ph">
      <div class="ph-left">
        <span>📝</span>
        <span class="ph-title">{title_esc}</span>
        <span class="badge" id="badge">{count}</span>
      </div>
      <button class="tb" id="tb" onclick="toggle()">−</button>
    </div>
    <div id="notes-body"></div>
  </div>
</div>
<script>
var notes={notes_js};
var body=document.getElementById('notes-body');
function renderNotes(){{
  body.innerHTML='';
  if(!notes.length){{
    body.innerHTML='<div class="em">No notes yet.<br>Add one below ↓</div>';
    return;
  }}
  notes.forEach(function(n){{
    var d=document.createElement('div'); d.className='ni';
    d.style.borderLeftColor=n.color;
    d.innerHTML='<div>'+n.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>'
      +'<div class="nt">'+n.time+'</div>';
    body.appendChild(d);
  }});
}}
renderNotes();

// Drag
var el=document.getElementById('panel');
var p1=0,p2=0,p3=0,p4=0;
var hdr=el.querySelector('.ph');
hdr.onmousedown=function(e){{
  if(e.target.id==='tb')return;
  e.preventDefault(); p3=e.clientX; p4=e.clientY;
  document.onmouseup=function(){{document.onmouseup=null;document.onmousemove=null;}};
  document.onmousemove=function(e){{
    e.preventDefault();
    p1=p3-e.clientX; p2=p4-e.clientY; p3=e.clientX; p4=e.clientY;
    el.style.top=(el.offsetTop-p2)+'px';
    el.style.left=(el.offsetLeft-p1)+'px';
    el.style.right='auto';
  }};
}};

// Toggle collapse
var collapsed=false;
function toggle(){{
  collapsed=!collapsed;
  document.getElementById('notes-body').style.display=collapsed?'none':'';
  document.getElementById('tb').textContent=collapsed?'+':'−';
}}
</script></body></html>"""

    components.html(html, height=416)

    # ── Note input form ─────────────────────────────────────────────────────
    hint_col, _ = st.columns([1, 4])
    with hint_col:
        st.markdown(
            f"<span style='font-size:12px;color:#6c7086'>"
            f"{'📋 ' + str(count) + ' note' + ('s' if count != 1 else '') + ' saved'  if count else '📋 No notes yet'}"
            f"&nbsp;&nbsp;<kbd style='background:#313244;color:#a6adc8;font-size:10px;"
            f"padding:1px 5px;border-radius:4px;border:1px solid #45475a'>Ctrl+Enter</kbd>"
            f"&nbsp;to save</span>",
            unsafe_allow_html=True,
        )

    with st.form(key=f"yt_form_{vid_id}", clear_on_submit=True):
        new_note = st.text_area(
            "note",
            placeholder="Type your note here…",
            height=80,
            label_visibility="collapsed",
        )
        c1, c2 = st.columns([4, 1])
        with c2:
            submitted = st.form_submit_button("💾 Save", type="primary",
                                              use_container_width=True)

    if submitted and new_note.strip():
        save_note(vid_id, "youtube", new_note.strip())
        st.toast("✅ Note saved!", icon="📝")
        st.rerun()

    # ── All notes expander ──────────────────────────────────────────────────
    if existing:
        with st.expander(f"📋 All notes ({count})", expanded=False):
            for note in existing:
                ca, cb = st.columns([6, 1])
                with ca:
                    st.markdown(
                        f"<div style='font-size:11px;color:#6c7086;margin-bottom:2px'>"
                        f"{note['created_at'][:16]}</div>"
                        f"<div style='font-size:13px;color:#cdd6f4'>{note['content']}</div>",
                        unsafe_allow_html=True,
                    )
                with cb:
                    if st.button("🗑️", key=f"yd_{note['id']}", help="Delete"):
                        delete_note(note["id"])
                        st.rerun()
                st.markdown(
                    "<hr style='border:none;border-top:1px solid #1e1e2e;margin:6px 0'>",
                    unsafe_allow_html=True,
                )
