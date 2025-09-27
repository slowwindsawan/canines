import requests
from typing import Optional, Dict, List
from dateutil import parser as dtparser
import pytz  # or use zoneinfo in newer Python
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

access_token = os.environ.get("CALENDLY_TOKEN")
organization_uri = os.environ.get("CALENDLY_ORG_URI")
target_tz="UTC"

def utc_to_local_fmt(utc_iso: str, fmt: str = "%d %b, %Y %I:%M %p") -> str:
    # parse the ISO string (assumes it ends with Z or has +00:00)
    dt_utc = datetime.fromisoformat(utc_iso.replace("Z", "+00:00"))
    # convert to local timezone
    dt_local = dt_utc.astimezone()  # defaults to local time zone
    return dt_local.strftime(fmt)

class CalendlyAPIError(Exception):
    pass

def get_calendly_booking_message(
    email: str,
    user_uri: Optional[str] = None,
    min_start_time: Optional[str] = None,
    max_start_time: Optional[str] = None
) -> str:
    """
    Checks if the user (by email) has a scheduled Calendly meeting.
    Returns a user-friendly message.

    If a meeting exists, returns e.g.:
      "You have already scheduled a meeting on 2025-09-29 at 15:00 UTC"
    Or, if in local timezone:
      "You have already scheduled a meeting on 2025-09-29 at 20:30 IST"
    If none, returns:
      "You have not scheduled any meeting yet."
    """

    # Helper to fetch events (same as before)
    def fetch_events() -> List[Dict]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }
        base = "https://api.calendly.com"
        path = "/scheduled_events"
        url = base + path

        params = {"invitee_email": email}
        if organization_uri:
            params["organization"] = organization_uri
        if user_uri:
            params["user"] = user_uri
        if min_start_time:
            params["min_start_time"] = min_start_time
        if max_start_time:
            params["max_start_time"] = max_start_time

        events: List[Dict] = []
        next_url = url
        first = True

        while next_url:
            resp = requests.get(next_url, headers=headers, params=(params if first else None))
            first = False
            if resp.status_code >= 400:
                raise CalendlyAPIError(f"Calendly API error {resp.status_code}: {resp.text}")

            body = resp.json()
            chunk = body.get("collection") or body.get("data") or []
            events.extend(chunk)

            pagination = body.get("pagination") or {}
            next_url = pagination.get("next_page")
        return events

    events = fetch_events()
    if not events:
        return False, "You have not scheduled any meeting yet."

    # For simplicity, take the earliest or first event
    ev = events[0]
    # The structure you pasted has:
    # ev["start_time"] and ev["uri"] etc, and inside ev["calendar_event"] etc.

    raw_start = ev.get("start_time")
    if raw_start is None:
        # fallback to other fields
        raw_start = ev.get("calendar_event", {}).get("start_time")

    try:
        dt = dtparser.isoparse(raw_start)
    except Exception:
        # If parsing fails, return generic
        return True, "(time unknown)."

    # Convert to desired timezone or leave in UTC
    if target_tz:
        try:
            tz = pytz.timezone(target_tz)
            dt = dt.astimezone(tz)
        except Exception:
            pass  # fail silently if tz wrong

    # Format nicely
    date_str = dt.strftime("%Y-%m-%d")
    time_str = dt.strftime("%H:%M")

    # Optionally include timezone abbreviation
    tz_abbrev = ""
    if dt.tzinfo:
        tz_abbrev = dt.tzname() or ""
        if tz_abbrev:
            time_str = f"{time_str} {tz_abbrev}"

    return True, f"{dt}"

if __name__ == "__main__":
    
    try:
        success, msg = get_calendly_booking_message(email="demo@demo.com")
        print(success, msg)
    except CalendlyAPIError as e:
        print("Error:", e)

