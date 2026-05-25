import os
from datetime import datetime

import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

_ICONS = {
    "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️", "Drizzle": "🌦️",
    "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Fog": "🌫️",
    "Haze": "🌫️", "Smoke": "🌫️", "Dust": "🌪️",
}


@st.cache_data(ttl=1800)
def _fetch(city: str, country: str, units: str) -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return {"error": "OPENWEATHER_API_KEY not set in .env"}
    try:
        resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": f"{city},{country}", "appid": api_key, "units": units},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        return {"error": str(e)}


def _render_single(cfg: dict, key_suffix: str = ""):
    city     = cfg.get("city", "New Delhi")
    country  = cfg.get("country", "IN")
    units    = cfg.get("units", "metric")
    unit_sym = "°C" if units == "metric" else "°F"

    data = _fetch(city, country, units)

    if "error" in data:
        st.error(f"Weather unavailable: {data['error']}")
        st.caption("Set `OPENWEATHER_API_KEY` in your `.env` file.")
        return

    icon      = _ICONS.get(data["weather"][0]["main"], "🌡️")
    temp      = round(data["main"]["temp"])
    feels     = round(data["main"]["feels_like"])
    humidity  = data["main"]["humidity"]
    desc      = data["weather"][0]["description"].title()
    wind      = data["wind"]["speed"]
    city_name = data["name"]
    city_id   = data["id"]

    c1, c2 = st.columns([1, 2])
    with c1:
        st.markdown(
            f"<div style='font-size:3rem;text-align:center'>{icon}</div>"
            f"<div style='font-size:1.9rem;font-weight:700;text-align:center'>{temp}{unit_sym}</div>",
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(f"**{city_name}** · {desc}")
        st.markdown(
            f"Feels like **{feels}{unit_sym}** &nbsp;|&nbsp; 💧 {humidity}% &nbsp;|&nbsp; 💨 {wind} m/s",
            unsafe_allow_html=True,
        )

    c3, c4 = st.columns(2)
    with c3:
        st.link_button("🌐 Forecast",
                       f"https://openweathermap.org/city/{city_id}",
                       use_container_width=True)
    with c4:
        if st.button("🔄", key=f"weather_refresh{key_suffix}", use_container_width=True,
                     help="Refresh"):
            _fetch.clear()
            st.rerun()

    st.caption(f"Updated {datetime.now().strftime('%H:%M')}")


def render_weather(config):
    st.markdown("### 🌤️ Weather Today")

    # Support both a single dict and a list of city dicts
    if isinstance(config, list):
        cities = config
    else:
        cities = [config]

    if len(cities) == 1:
        _render_single(cities[0], key_suffix="0")
    else:
        tabs = st.tabs([c.get("city", f"City {i+1}") for i, c in enumerate(cities)])
        for i, (tab, cfg) in enumerate(zip(tabs, cities)):
            with tab:
                _render_single(cfg, key_suffix=str(i))
