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


def render_weather(config: dict):
    city = config.get("city", "New Delhi")
    country = config.get("country", "IN")
    units = config.get("units", "metric")
    unit_sym = "°C" if units == "metric" else "°F"

    st.markdown("### 🌤️ Weather Today")

    data = _fetch(city, country, units)

    if "error" in data:
        st.error(f"Weather unavailable: {data['error']}")
        st.caption("Set `OPENWEATHER_API_KEY` in your `.env` file.")
        return

    main_condition = data["weather"][0]["main"]
    icon = _ICONS.get(main_condition, "🌡️")
    temp = round(data["main"]["temp"])
    feels = round(data["main"]["feels_like"])
    humidity = data["main"]["humidity"]
    desc = data["weather"][0]["description"].title()
    wind = data["wind"]["speed"]
    city_name = data["name"]
    city_id = data["id"]

    c1, c2 = st.columns([1, 2])
    with c1:
        st.markdown(
            f"<div style='font-size:3.5rem;text-align:center'>{icon}</div>"
            f"<div style='font-size:2rem;font-weight:700;text-align:center'>{temp}{unit_sym}</div>",
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(f"**{city_name}** · {desc}")
        st.markdown(f"Feels like **{feels}{unit_sym}** &nbsp;|&nbsp; 💧 {humidity}% &nbsp;|&nbsp; 💨 {wind} m/s",
                    unsafe_allow_html=True)

    c3, c4 = st.columns(2)
    with c3:
        st.link_button("🌐 Full Forecast",
                       f"https://openweathermap.org/city/{city_id}",
                       use_container_width=True)
    with c4:
        if st.button("🔄 Refresh", key="weather_refresh", use_container_width=True):
            _fetch.clear()
            st.rerun()

    st.caption(f"Updated {datetime.now().strftime('%H:%M')}")
