"use strict";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const MAX_EVENTS = 25;
const LOOKAHEAD_DAYS = 7;
const URGENT_WINDOW_MIN = 60;

function createCalendarClient(googleApi) {
  return {
    async getActivity() {
      const now = new Date();
      const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 3600 * 1000);
      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: String(MAX_EVENTS)
      });
      const data = await googleApi(CALENDAR_API, `/calendars/primary/events?${params}`);
      return { feed: buildFeed(data.items || [], now), fetchedAt: new Date().toISOString() };
    }
  };
}

function pad(n) { return String(n).padStart(2, "0"); }

function shortTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function isAllDay(ev) {
  return Boolean(ev.start && ev.start.date && !ev.start.dateTime);
}

function mapEvent(ev, now = new Date()) {
  const start = (ev.start && (ev.start.dateTime || ev.start.date)) || "";
  const end = (ev.end && (ev.end.dateTime || ev.end.date)) || "";
  const startMs = start ? Date.parse(start) : 0;
  const minutesUntil = startMs ? (startMs - now.getTime()) / 60000 : Infinity;
  const urgent = minutesUntil >= 0 && minutesUntil <= URGENT_WINDOW_MIN;
  const when = isAllDay(ev)
    ? `all day ${start}`
    : `${shortTime(start)}${end ? " – " + shortTime(end) : ""}`;
  return {
    c: "calendar",
    kind: "event",
    title: ev.summary || "(busy)",
    desc: `${when}${ev.location ? " · " + ev.location : ""}`,
    urgent,
    tag: urgent ? "action" : "",
    real: true,
    ref: ev.htmlLink || "",
    id: ev.id || "",
    when,
    minutesUntil: Number.isFinite(minutesUntil) ? Math.round(minutesUntil) : null
  };
}

function buildFeed(items, now = new Date()) {
  const seen = new Set();
  const feed = [];
  for (const ev of items) {
    if (!ev || !ev.id || seen.has(ev.id)) continue;
    seen.add(ev.id);
    feed.push(mapEvent(ev, now));
  }
  feed.sort((a, b) => (a.minutesUntil ?? Infinity) - (b.minutesUntil ?? Infinity));
  return feed;
}

module.exports = { createCalendarClient, buildFeed, mapEvent, shortTime, CALENDAR_API };
