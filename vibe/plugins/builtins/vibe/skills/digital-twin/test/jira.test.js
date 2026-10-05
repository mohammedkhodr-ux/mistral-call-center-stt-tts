"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createJiraClient, buildFeed, mapIssue, JiraError } = require("../lib/jira");

const BASE = "https://acme.atlassian.net";

const issueFixture = (over = {}) => ({
  key: "OPS-2231",
  fields: {
    summary: "Rotate deploy credentials",
    status: { name: "In Progress" },
    priority: { name: "High" },
    duedate: "2026-10-08",
    updated: "2026-10-05T08:00:00.000Z"
  },
  ...over
});

test("mapIssue flags high/blocker/critical priorities as urgent", () => {
  assert.equal(mapIssue(issueFixture(), BASE).urgent, true);
  assert.equal(mapIssue(issueFixture({ fields: { ...issueFixture().fields, priority: { name: "Blocker" } } }), BASE).urgent, true);
  assert.equal(mapIssue(issueFixture({ fields: { ...issueFixture().fields, priority: { name: "Critical" } } }), BASE).urgent, true);
  assert.equal(mapIssue(issueFixture({ fields: { ...issueFixture().fields, priority: { name: "Low" } } }), BASE).urgent, false);
});

test("mapIssue builds title, desc, and browse link", () => {
  const item = mapIssue(issueFixture(), BASE);
  assert.equal(item.title, "OPS-2231: Rotate deploy credentials");
  assert.match(item.desc, /In Progress/);
  assert.match(item.desc, /priority High/);
  assert.match(item.desc, /due 2026-10-08/);
  assert.equal(item.ref, `${BASE}/browse/OPS-2231`);
  assert.equal(item.real, true);
});

test("mapIssue tolerates missing priority/status/duedate", () => {
  const item = mapIssue({ key: "X-1", fields: {} }, BASE);
  assert.equal(item.title, "X-1: (no summary)");
  assert.match(item.desc, /priority —/);
  assert.doesNotMatch(item.desc, /due/);
});

test("buildFeed dedupes by key", () => {
  const feed = buildFeed([issueFixture(), issueFixture()], BASE);
  assert.equal(feed.length, 1);
});

test("client requires baseUrl, email, and apiToken", () => {
  assert.throws(() => createJiraClient({}), /required/);
  assert.throws(() => createJiraClient({ baseUrl: BASE }), /required/);
});

test("client sends Basic auth and queries assigned unresolved issues", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    assert.match(opts.headers.Authorization, /^Basic /);
    const expected = "Basic " + Buffer.from("you@acme.com:tok").toString("base64");
    assert.equal(opts.headers.Authorization, expected);
    assert.match(url, /\/rest\/api\/3\/search/);
    assert.match(url, /assignee%20%3D%20currentUser/);
    assert.match(url, /resolution%20%3D%20Unresolved/);
    return { status: 200, ok: true, json: async () => ({ issues: [issueFixture()] }) };
  };
  const client = createJiraClient({ baseUrl: BASE + "/", email: "you@acme.com", apiToken: "tok" }, fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.feed.length, 1);
  assert.equal(calls.length, 1);
});

test("client maps 401/403 to an auth error and 429 to rate limit", async () => {
  const mk = (status) => createJiraClient(
    { baseUrl: BASE, email: "e", apiToken: "t" },
    async () => ({ status, ok: false, json: async () => ({}) })
  );
  await assert.rejects(() => mk(401).api("/rest/api/3/search?jql=x"), (e) => e instanceof JiraError && e.status === 401);
  await assert.rejects(() => mk(403).api("/rest/api/3/search?jql=x"), /authentication failed/);
  await assert.rejects(() => mk(429).api("/rest/api/3/search?jql=x"), /rate limit/);
});
