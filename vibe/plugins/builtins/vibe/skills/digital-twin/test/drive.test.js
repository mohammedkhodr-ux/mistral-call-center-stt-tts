"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createDriveClient, buildFeed, mapFile, relative } = require("../providers/drive");

const NOW = new Date("2026-10-05T12:00:00Z");

const fileFixture = (over = {}) => ({
  id: "f1",
  name: "Q3 Roadmap.docx",
  modifiedTime: "2026-10-05T09:00:00.000Z",
  webViewLink: "https://drive.google.com/file/d/f1/view",
  lastModifyingUser: { displayName: "Mira Chen" },
  ...over
});

test("relative renders minutes, hours, and days", () => {
  assert.equal(relative("2026-10-05T11:59:00Z", NOW), "1m ago");
  assert.equal(relative("2026-10-05T09:00:00Z", NOW), "3h ago");
  assert.equal(relative("2026-10-03T12:00:00Z", NOW), "2d ago");
  assert.equal(relative("not-a-date", NOW), "");
});

test("mapFile includes name, modifier, and link", () => {
  const item = mapFile(fileFixture(), NOW);
  assert.equal(item.c, "drive");
  assert.equal(item.title, "Q3 Roadmap.docx");
  assert.match(item.desc, /Mira Chen/);
  assert.match(item.desc, /3h ago/);
  assert.equal(item.ref, "https://drive.google.com/file/d/f1/view");
  assert.equal(item.real, true);
});

test("mapFile falls back to email and 'someone'", () => {
  const byEmail = mapFile(fileFixture({ lastModifyingUser: { emailAddress: "sam@acme.com" } }), NOW);
  assert.match(byEmail.desc, /sam@acme\.com/);
  const byNone = mapFile(fileFixture({ lastModifyingUser: null }), NOW);
  assert.match(byNone.desc, /someone/);
});

test("buildFeed dedupes by id", () => {
  const feed = buildFeed([fileFixture(), fileFixture()], NOW);
  assert.equal(feed.length, 1);
});

test("getActivity queries non-trashed files modified in the last 7 days", async () => {
  const calls = [];
  const fakeApi = async (base, path) => {
    calls.push(base + path);
    return { files: [fileFixture()] };
  };
  const client = createDriveClient(fakeApi);
  const activity = await client.getActivity();
  assert.equal(activity.feed.length, 1);
  assert.match(calls[0], /googleapis\.com\/drive\/v3\/files/);
  const q = new URL("https://x/?" + calls[0].split("?")[1]).searchParams;
  assert.match(q.get("q"), /trashed = false/);
  assert.match(q.get("q"), /modifiedTime > '/);
  assert.equal(q.get("orderBy"), "modifiedTime desc");
});
