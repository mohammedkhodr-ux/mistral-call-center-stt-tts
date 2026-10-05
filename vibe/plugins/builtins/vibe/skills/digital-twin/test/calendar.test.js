"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createCalendarClient, buildFeed, mapEvent, shortTime } = require("../lib/calendar");

const NOW = new Date("2026-10-05T10:00:00Z");

const eventFixture = (over = {}) => ({
  id: "ev1",
  summary: "Standup",
  htmlLink: "https://calendar.google.com/event?eid=ev1",
  start: { dateTime: "2026-10-05T10:30:00Z" },
  end: { dateTime: "2026-10-05T10:45:00Z" },
  ...over
});

test("mapEvent flags events starting within 60 minutes as urgent", () => {
  const soon = mapEvent(eventFixture(), NOW);
  assert.equal(soon.urgent, true);
  assert.equal(soon.tag, "action");
  assert.equal(soon.minutesUntil, 30);
});

test("mapEvent does not flag later events", () => {
  const later = mapEvent(eventFixture({
    start: { dateTime: "2026-10-05T15:00:00Z" },
    end: { dateTime: "2026-10-05T16:00:00Z" }
  }), NOW);
  assert.equal(later.urgent, false);
  assert.equal(later.minutesUntil, 300);
});

test("mapEvent handles all-day events", () => {
  const allDay = mapEvent(eventFixture({
    summary: "Conference",
    start: { date: "2026-10-06" },
    end: { date: "2026-10-07" }
  }), NOW);
  assert.match(allDay.desc, /all day 2026-10-06/);
});

test("mapEvent falls back for untitled and locationless events", () => {
  const ev = mapEvent(eventFixture({ summary: undefined }), NOW);
  assert.equal(ev.title, "(busy)");
  assert.doesNotMatch(ev.desc, /·/);
});

test("buildFeed dedupes by id and sorts soonest first", () => {
  const feed = buildFeed([
    eventFixture({ id: "late", start: { dateTime: "2026-10-05T18:00:00Z" } }),
    eventFixture({ id: "soon", start: { dateTime: "2026-10-05T11:00:00Z" } }),
    eventFixture({ id: "soon", start: { dateTime: "2026-10-05T11:00:00Z" } })
  ], NOW);
  assert.equal(feed.length, 2);
  assert.equal(feed[0].id, "soon");
});

test("shortTime formats in UTC", () => {
  assert.equal(shortTime("2026-10-05T09:05:00Z"), "10-05 09:05 UTC");
});

test("getActivity queries the primary calendar with a time window", async () => {
  const calls = [];
  const fakeApi = async (base, path) => {
    calls.push(base + path);
    assert.match(base, /googleapis\.com\/calendar\/v3/);
    assert.match(path, /timeMin=/);
    assert.match(path, /timeMax=/);
    assert.match(path, /singleEvents=true/);
    return { items: [eventFixture()] };
  };
  const client = createCalendarClient(fakeApi);
  const activity = await client.getActivity();
  assert.equal(activity.feed.length, 1);
  assert.equal(calls.length, 1);
  const q = new URL("https://x/?" + calls[0].split("?")[1]).searchParams;
  assert.ok(q.get("timeMin") && q.get("timeMax"));
  assert.ok(Date.parse(q.get("timeMax")) > Date.parse(q.get("timeMin")));
  assert.ok(Date.parse(q.get("timeMax")) - Date.parse(q.get("timeMin")) <= 8 * 24 * 3600 * 1000);
});
