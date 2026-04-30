import hashlib
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from utils.database import (delete_highlight, delete_note, get_highlights,
                             get_notes, save_highlight, save_note)

_COLOR_HEX = {
    "yellow": "#ffd700",
    "cyan":   "#89dceb",
    "green":  "#a6e3a1",
    "pink":   "#f38ba8",
}

_DRAG_JS = """
function dragElement(el){
  var p1=0,p2=0,p3=0,p4=0;
  var hdr=el.querySelector('.ph');
  hdr.style.cursor='move'; hdr.onmousedown=dn;
  function dn(e){
    if(e.target.classList.contains('tb'))return;
    e.preventDefault(); p3=e.clientX; p4=e.clientY;
    document.onmouseup=up; document.onmousemove=mv;
  }
  function mv(e){
    e.preventDefault();
    p1=p3-e.clientX; p2=p4-e.clientY; p3=e.clientX; p4=e.clientY;
    el.style.top=(el.offsetTop-p2)+'px';
    el.style.left=(el.offsetLeft-p1)+'px';
    el.style.right='auto';
  }
  function up(){document.onmouseup=null;document.onmousemove=null;}
}
function togglePanel(){
  var b=document.getElementById('nb');
  var btn=document.getElementById('tb');
  var h=b.style.display==='none';
  b.style.display=h?'block':'none'; btn.textContent=h?'−':'+';
}
"""


def _load_pages() -> list[dict]:
    p = Path("static/web_pages.json")
    return json.loads(p.read_text()) if p.exists() else []


def _ck(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:10]


def render_webpage():
    st.markdown("### 🌐 Web Page Viewer")

    pages = _load_pages()

    if not pages:
        st.info("Add entries to `static/web_pages.json` to get started.")
        with st.expander("Format"):
            st.json([{"title": "Page Title", "url": "https://example.com", "description": "optional"}])
        return

    titles = [p.get("title", f"Page {i+1}") for i, p in enumerate(pages)]
    c_sel, c_open = st.columns([4, 1])
    with c_sel:
        idx = st.selectbox("Select page", range(len(titles)),
                           format_func=lambda i: titles[i], key="wp_select")
    page = pages[idx]
    url  = page.get("url", "")
    ck   = _ck(url)

    with c_open:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        st.link_button("🌐 Open", url, use_container_width=True)

    if page.get("description"):
        st.caption(page["description"])

    # ── Load saved data ────────────────────────────────────────────────────
    highlights    = get_highlights(url)
    existing_notes = get_notes(url, "webpage")

    hl_data = [{"text": h["selected_text"],
                "color": _COLOR_HEX.get(h["color"], "#ffd700"),
                "note": h.get("note", "")}
               for h in highlights]
    notes_data = [{"content": n["content"], "time": n["created_at"][:16]}
                  for n in existing_notes]
    hl_json    = json.dumps(hl_data)
    notes_json = json.dumps(notes_data)

    # ── Embedded viewer + floating notes panel ─────────────────────────────
    # NOTE: The page loads in a cross-origin iframe, so JavaScript inside the
    # component cannot detect text selected *inside* that iframe. Highlights
    # are added manually via the form below the viewer.
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{background:transparent;font-family:-apple-system,sans-serif;overflow:hidden}}
    #wrap{{position:relative;width:100%;height:510px}}
    iframe{{width:100%;height:510px;border:1px solid #313244;border-radius:10px;
      background:#fff;display:block}}
    #np{{
      position:absolute;top:14px;right:14px;width:272px;
      background:rgba(17,17,27,.97);border:1px solid #89b4fa;
      border-radius:12px;padding:12px;z-index:50;
      box-shadow:0 8px 28px rgba(0,0,0,.65);
      max-height:460px;display:flex;flex-direction:column;
    }}
    .ph{{display:flex;justify-content:space-between;align-items:center;
      padding-bottom:8px;border-bottom:1px solid #313244;margin-bottom:8px}}
    .ph-t{{color:#89b4fa;font-size:12px;font-weight:600}}
    .tb{{background:none;border:none;color:#6c7086;font-size:18px;
      cursor:pointer;padding:0;line-height:1}}
    #nb{{overflow-y:auto;flex:1}}
    .sec{{font-size:10px;color:#6c7086;text-transform:uppercase;
      letter-spacing:.06em;margin:8px 0 4px}}
    .hl{{border-left:3px solid #ffd700;padding:4px 8px;margin:4px 0;
      font-size:11px;color:#cdd6f4;border-radius:0 4px 4px 0;
      background:rgba(255,215,0,.05)}}
    .ni{{background:rgba(255,255,255,.05);border-radius:8px;
      padding:8px;margin:4px 0;font-size:11px;color:#cdd6f4}}
    .nt{{font-size:10px;color:#6c7086;margin-top:3px}}
    .em{{color:#585b70;font-size:11px;text-align:center;padding:10px 0}}
    </style></head><body>
    <div id="wrap">
      <iframe src="{url}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
      <div id="np">
        <div class="ph">
          <span class="ph-t">📝 Notes &amp; Highlights</span>
          <button class="tb" id="tb" onclick="togglePanel()">−</button>
        </div>
        <div id="nb">
          <div class="sec">Highlights</div>
          <div id="hl-list"></div>
          <div class="sec" style="margin-top:8px">Notes</div>
          <div id="n-list"></div>
        </div>
      </div>
    </div>
    <script>
    var hls={hl_json}, nts={notes_json};
    var hlList=document.getElementById('hl-list');
    var nList=document.getElementById('n-list');
    if(!hls.length){{
      hlList.innerHTML='<div class="em">No highlights yet.</div>';
    }}else{{
      hls.forEach(function(h){{
        var d=document.createElement('div'); d.className='hl';
        d.style.borderLeftColor=h.color;
        d.textContent='"'+h.text.substring(0,65)+(h.text.length>65?'…':'')+'"';
        if(h.note){{var s=document.createElement('div');
          s.style.cssText='color:#6c7086;font-size:10px;margin-top:2px';
          s.textContent=h.note; d.appendChild(s);}}
        hlList.appendChild(d);
      }});
    }}
    if(!nts.length){{
      nList.innerHTML='<div class="em">No notes yet.</div>';
    }}else{{
      nts.forEach(function(n){{
        var d=document.createElement('div'); d.className='ni';
        d.innerHTML='<div>'+n.content+'</div><div class="nt">'+n.time+'</div>';
        nList.appendChild(d);
      }});
    }}
    {_DRAG_JS}
    dragElement(document.getElementById('np'));
    </script></body></html>"""

    components.html(html, height=524)

    # ── Add Highlight (always visible — cross-origin iframe blocks in-page selection) ──
    st.markdown(
        "<p style='font-size:12px;color:#6c7086;margin:8px 0 4px'>"
        "📌 <b>Add Highlight</b> — select text on the page above, copy it, paste below</p>",
        unsafe_allow_html=True,
    )
    with st.form(key=f"hl_form_{ck}", clear_on_submit=True):
        ca, cb = st.columns([4, 1])
        with ca:
            hl_text = st.text_input("Highlighted text",
                                    placeholder="Paste selected text here…",
                                    label_visibility="collapsed",
                                    key=f"hl_t_{ck}")
        with cb:
            hl_color = st.selectbox("Color", ["yellow", "cyan", "green", "pink"],
                                    label_visibility="collapsed",
                                    key=f"hl_c_{ck}")
        hl_note = st.text_input("Optional note about this highlight",
                                placeholder="Note (optional)…",
                                label_visibility="collapsed",
                                key=f"hl_n_{ck}")
        if st.form_submit_button("🖊️ Save Highlight", use_container_width=False):
            if hl_text.strip():
                save_highlight(url, hl_text.strip(), hl_note.strip(), hl_color)
                st.toast("Highlight saved!", icon="🟡")
                st.rerun()

    # ── Add Note ───────────────────────────────────────────────────────────
    st.markdown(
        "<p style='font-size:12px;color:#6c7086;margin:8px 0 4px'>"
        "💬 <b>Add Note</b> &nbsp;<code style='font-size:11px;background:#313244;"
        "padding:1px 5px;border-radius:3px'>Ctrl+Enter</code></p>",
        unsafe_allow_html=True,
    )
    with st.form(key=f"note_form_{ck}", clear_on_submit=True):
        new_note = st.text_area("Note", placeholder="Write your note…",
                                height=72, label_visibility="collapsed",
                                key=f"wp_note_{ck}")
        if st.form_submit_button("💾 Save Note", type="primary"):
            if new_note.strip():
                save_note(url, "webpage", new_note.strip())
                st.toast("Note saved!", icon="✅")
                st.rerun()

    # ── Saved items ────────────────────────────────────────────────────────
    if highlights or existing_notes:
        c_hl, c_nt = st.columns(2)
        with c_hl:
            if highlights:
                with st.expander(f"🟡 Highlights ({len(highlights)})"):
                    for h in highlights:
                        hex_c = _COLOR_HEX.get(h["color"], "#ffd700")
                        cr, cd = st.columns([5, 1])
                        with cr:
                            st.markdown(
                                f"<span style='background:{hex_c};color:#11111b;"
                                f"padding:2px 5px;border-radius:3px;font-size:12px'>"
                                f"{h['selected_text'][:80]}</span>",
                                unsafe_allow_html=True,
                            )
                            if h.get("note"):
                                st.caption(h["note"])
                        with cd:
                            if st.button("🗑️", key=f"hdel_{h['id']}"):
                                delete_highlight(h["id"])
                                st.rerun()
                        st.divider()
        with c_nt:
            if existing_notes:
                with st.expander(f"💬 Notes ({len(existing_notes)})"):
                    for note in existing_notes:
                        cr, cd = st.columns([5, 1])
                        with cr:
                            st.caption(note["created_at"][:16])
                            st.write(note["content"])
                        with cd:
                            if st.button("🗑️", key=f"ndel_{note['id']}"):
                                delete_note(note["id"])
                                st.rerun()
                        st.divider()
