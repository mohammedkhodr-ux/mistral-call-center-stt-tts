"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createGitHubClient,
  buildFeed,
  mapReviewRequest,
  mapAssigned,
  mapMention,
  GitHubError
} = require("../lib/github");

const prFixture = (over = {}) => ({
  title: "Fix flaky checkout test",
  html_url: "https://github.com/acme/app/pull/91",
  number: 91,
  user: { login: "mira" },
  draft: false,
  repository_url: "https://api.github.com/repos/acme/app",
  ...over
});

const issueFixture = (over = {}) => ({
  title: "Rotate deploy credentials",
  html_url: "https://github.com/acme/app/issues/42",
  number: 42,
  user: { login: "sam" },
  repository_url: "https://api.github.com/repos/acme/app",
  ...over
});

test("mapReviewRequest marks non-draft PRs urgent and keeps repo/number", () => {
  const item = mapReviewRequest(prFixture());
  assert.equal(item.kind, "review");
  assert.equal(item.urgent, true);
  assert.equal(item.repo, "acme/app");
  assert.equal(item.number, 91);
  assert.equal(item.real, true);
  assert.equal(item.ref, "https://github.com/acme/app/pull/91");
  assert.match(item.title, /Review requested: Fix flaky checkout test/);
});

test("mapReviewRequest treats drafts as not urgent", () => {
  const item = mapReviewRequest(prFixture({ draft: true }));
  assert.equal(item.urgent, false);
  assert.match(item.desc, /draft/);
});

test("mapAssigned distinguishes PRs from issues", () => {
  const issue = mapAssigned(issueFixture());
  const pr = mapAssigned(issueFixture({ pull_request: { url: "x" }, html_url: "https://github.com/acme/app/pull/7", number: 7 }));
  assert.match(issue.title, /^Issue assigned to you/);
  assert.match(pr.title, /^PR assigned to you/);
  assert.equal(issue.kind, "assigned");
});

test("mapMention handles PRs and issues", () => {
  const m = mapMention(issueFixture({ pull_request: { url: "x" } }));
  assert.match(m.title, /^PR mentions you/);
  assert.equal(m.kind, "mention");
});

test("buildFeed dedupes across lists by html_url", () => {
  const shared = prFixture();
  const feed = buildFeed([shared], [shared], [shared]);
  assert.equal(feed.length, 1);
  assert.equal(feed[0].kind, "review");
});

test("buildFeed orders reviews first, then assigned, then mentions", () => {
  const feed = buildFeed([prFixture()], [issueFixture()], [issueFixture({ html_url: "https://github.com/acme/app/issues/9", number: 9 })]);
  assert.deepEqual(feed.map(f => f.kind), ["review", "assigned", "mention"]);
});

test("client rejects immediately without a token", async () => {
  assert.throws(() => createGitHubClient(""), /GITHUB_TOKEN is not set/);
});

test("client surfaces 401 as invalid token", async () => {
  const fakeFetch = async () => ({ status: 401, ok: false, headers: new Map(), json: async () => ({}) });
  const client = createGitHubClient("bad-token", fakeFetch);
  await assert.rejects(() => client.api("/user"), (e) => e instanceof GitHubError && e.status === 401);
});

test("client surfaces rate limit distinctly from other 403s", async () => {
  const headers = new Map([["x-ratelimit-remaining", "0"]]);
  const fakeFetch = async () => ({ status: 403, ok: false, headers, json: async () => ({}) });
  const client = createGitHubClient("token", fakeFetch);
  await assert.rejects(() => client.api("/user"), /rate limit/);
});

test("getActivity aggregates the three search queries", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url.endsWith("/user")) {
      return { status: 200, ok: true, headers: new Map(), json: async () => ({ login: "you" }) };
    }
    const q = new URL(url).searchParams.get("q");
    const items = q.includes("review-requested")
      ? [prFixture()]
      : q.includes("mentions")
        ? [issueFixture()]
        : [issueFixture({ html_url: "https://github.com/acme/app/issues/5", number: 5 })];
    return { status: 200, ok: true, headers: new Map(), json: async () => ({ items }) };
  };
  const client = createGitHubClient("token", fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.user, "you");
  assert.equal(activity.feed.length, 3);
  assert.equal(calls.length, 4);
  assert.ok(calls.some(u => u.includes("review-requested%3A%40me") || u.includes("review-requested:@me")));
});
