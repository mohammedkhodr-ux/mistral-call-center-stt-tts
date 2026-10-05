"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createNotionClient, buildFeed, mapPage, pageTitle, relative, NotionError } = require("../providers/notion");

const NOW = new Date("2026-10-05T12:00:00Z");

const pageFixture = (over = {}) => ({
  id: "p1",
  url: "https://notion.so/Q3-Roadmap-p1",
  last_edited_time: "2026-10-05T10:30:00.000Z",
  parent: { type: "workspace" },
  properties: {
    Name: { type: "title", title: [{ plain_text: "Q3 Roadmap" }] }
  },
  ...over
});

test("pageTitle extracts the title property", () => {
  assert.equal(pageTitle(pageFixture()), "Q3 Roadmap");
  assert.equal(pageTitle(pageFixture({ properties: { Name: { type: "title", title: [] } } })), "(untitled)");
  assert.equal(pageTitle(pageFixture({ properties: {} })), "(untitled)");
});

test("relative renders minutes, hours, days", () => {
  assert.equal(relative("2026-10-05T11:30:00Z", NOW), "30m ago");
  assert.equal(relative("2026-10-05T08:00:00Z", NOW), "4h ago");
  assert.equal(relative("2026-10-01T12:00:00Z", NOW), "4d ago");
  assert.equal(relative("junk", NOW), "");
});

test("mapPage builds feed items with notion link", () => {
  const item = mapPage(pageFixture(), NOW);
  assert.equal(item.c, "notion");
  assert.equal(item.title, "Q3 Roadmap");
  assert.match(item.desc, /Edited 1h ago/);
  assert.equal(item.ref, "https://notion.so/Q3-Roadmap-p1");
  assert.equal(item.real, true);
});

test("buildFeed dedupes by id", () => {
  const feed = buildFeed([pageFixture(), pageFixture()], NOW);
  assert.equal(feed.length, 1);
});

test("client rejects immediately without a token", () => {
  assert.throws(() => createNotionClient(""), /NOTION_TOKEN is not set/);
});

test("client sends auth + version headers and posts to /search", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    assert.equal(url, "https://api.notion.com/v1/search");
    assert.equal(opts.headers.Authorization, "Bearer secret_x");
    assert.equal(opts.headers["Notion-Version"], "2022-06-28");
    const body = JSON.parse(opts.body);
    assert.equal(body.sort.direction, "descending");
    return { status: 200, ok: true, json: async () => ({ results: [pageFixture()] }) };
  };
  const client = createNotionClient("secret_x", fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.feed.length, 1);
  assert.equal(calls.length, 1);
});

test("client maps 401, 429, and error bodies", async () => {
  const mk = (status, body) => createNotionClient("t", async () => ({
    status, ok: status < 400, json: async () => body
  }));
  await assert.rejects(() => mk(401, {}).api("/search", {}), (e) => e instanceof NotionError && e.status === 401);
  await assert.rejects(() => mk(429, {}).api("/search", {}), /rate limit/);
  await assert.rejects(
    () => mk(200, { object: "error", message: "integration not found" }).api("/search", {}),
    /integration not found/
  );
});
