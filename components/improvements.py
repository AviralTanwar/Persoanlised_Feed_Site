import streamlit as st

from utils.database import (delete_improvement, get_improvements,
                             save_improvement, update_improvement_status)

_PRIORITY_ICON = {"high": "🔴", "medium": "🟡", "low": "🟢"}
_STATUS_LABEL = {
    "pending":     "⏳ Pending",
    "in_progress": "🔄 In Progress",
    "done":        "✅ Done",
}


def render_improvements():
    st.markdown("### 💡 Notes of Improvement")

    c_main, c_side = st.columns([3, 1])

    with c_side:
        with st.form("imp_form", clear_on_submit=True):
            st.markdown("**➕ Add Note**")
            title = st.text_input("Title")
            content = st.text_area("Details", height=80)
            priority = st.selectbox("Priority", ["high", "medium", "low"], index=1)
            submitted = st.form_submit_button("Save", type="primary", use_container_width=True)
            if submitted and title.strip():
                save_improvement(title.strip(), content.strip(), priority)
                st.success("Saved!")
                st.rerun()

    improvements = get_improvements()

    with c_main:
        if not improvements:
            st.info("No improvement notes yet. Add one on the right →")
            return

        filter_status = st.multiselect(
            "Filter by status",
            ["pending", "in_progress", "done"],
            default=["pending", "in_progress"],
            key="imp_filter",
        )

        shown = [i for i in improvements if i["status"] in filter_status]

        if not shown:
            st.caption("No items match the current filter.")
            return

        for imp in shown:
            with st.container():
                c1, c2, c3 = st.columns([3, 1, 0.4])
                with c1:
                    p_icon = _PRIORITY_ICON.get(imp["priority"], "⚪")
                    st.markdown(f"{p_icon} **{imp['title']}**")
                    if imp["content"]:
                        st.caption(imp["content"])
                    st.caption(f"Added {imp['created_at'][:10]}")
                with c2:
                    statuses = ["pending", "in_progress", "done"]
                    new_status = st.selectbox(
                        "",
                        statuses,
                        index=statuses.index(imp["status"]),
                        key=f"imp_s_{imp['id']}",
                        label_visibility="collapsed",
                        format_func=lambda s: _STATUS_LABEL[s],
                    )
                    if new_status != imp["status"]:
                        update_improvement_status(imp["id"], new_status)
                        st.rerun()
                with c3:
                    if st.button("🗑️", key=f"imp_d_{imp['id']}", help="Delete"):
                        delete_improvement(imp["id"])
                        st.rerun()
            st.divider()
