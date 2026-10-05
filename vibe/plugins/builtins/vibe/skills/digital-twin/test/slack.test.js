"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSlackClient,
  buildFeed,
  truncate,
  permalink,
  SlackError
} = require("../providers/slack");

const BOT = "UBOT123";

const msg = (over = {}) => ({
  user: "UMIRA",
  text: "hey can you look at this?",
  ts: "1700000001.000100",
  ...over
});

const channel = (over = {}) => ({ id: "C123", name: "eng-deploys", ...over });

test("buildFeed flags messages containing <@BOT> as urgent mentions", () => {
  const feed = buildFeed(
    [{ channel: channel(), messages: [msg({ text: `<@${BOT}> the deploy is red` })] }],
    BOT,
    { UMIRA: "Mira" },
    "https://acme.slack.com/"
  );
  assert.equal(feed.length, 1);
  assert.equal(feed[0].kind, "mention");
  assert.equal(feed[0].urgent, true);
  assert.equal(feed[0].tag, "action");
  assert.match(feed[0].title, /@Mira mentioned you in #eng-deploys/);
});

test("buildFeed treats other messages as normal channel activity", () => {
  const feed = buildFeed([{ channel: channel(), messages: [msg()] }], BOT, { UMIRA: "Mira" });
  assert.equal(feed[0].kind, "message");
  assert.equal(feed[0].urgent, false);
  assert.match(feed[0].title, /^#eng-deploys: Mira$/);
});

test("buildFeed skips bot's own messages and textless messages", () => {
  const feed = buildFeed(
    [{ channel: channel(), messages: [msg({ user: BOT }), msg({ text: "" }), msg({ ts: "" })] }],
    BOT
  );
  assert.equal(feed.length, 0);
});

test("buildFeed sorts newest first and caps at 25 items", () => {
  const messages = [];
  for (let i = 0; i < 40; i++) {
    messages.push(msg({ ts: `1700000${String(i).padStart(3, "0")}.000100` }));
  }
  const feed = buildFeed([{ channel: channel(), messages }], BOT);
  assert.equal(feed.length, 25);
  assert.ok(Number(feed[0].ts) >= Number(feed[feed.length - 1].ts));
});

test("buildFeed falls back to user id when the name lookup is missing", () => {
  const feed = buildFeed([{ channel: channel(), messages: [msg({ user: "UUNKNOWN" })] }], BOT, {});
  assert.match(feed[0].title, /UUNKNOWN/);
});

test("truncate strips mention markup, link labels, and collapses whitespace", () => {
  assert.equal(truncate("<@U123|mira> check <#C9|general>"), "@U123 check #general");
  assert.equal(truncate("a   b\n\nc"), "a b c");
  const long = "x".repeat(200);
  assert.equal(truncate(long).length, 140);
  assert.ok(truncate(long).endsWith("…"));
});

test("permalink builds an archives URL from team url, channel and ts", () => {
  assert.equal(
    permalink("https://acme.slack.com/", "C123", "1700000001.000100"),
    "https://acme.slack.com/archives/C123/p1700000001000100"
  );
});

test("client rejects immediately without a token", () => {
  assert.throws(() => createSlackClient(""), /SLACK_BOT_TOKEN is not set/);
});

test("client maps Slack-level invalid_auth to a 401 SlackError", async () => {
  const fakeFetch = async () => ({
    status: 200, ok: true, headers: new Map(),
    json: async () => ({ ok: false, error: "invalid_auth" })
  });
  const client = createSlackClient("xoxb-bad", fakeFetch);
  await assert.rejects(() => client.api("auth.test"), (e) => e instanceof SlackError && e.status === 401);
});

test("client maps HTTP 429 with Retry-After header", async () => {
  const headers = new Map([["retry-after", "3"]]);
  const fakeFetch = async () => ({ status: 429, ok: false, headers, json: async () => ({}) });
  const client = createSlackClient("xoxb-token", fakeFetch);
  await assert.rejects(() => client.api("auth.test"), (e) => e instanceof SlackError && e.status === 429 && e.retryAfter === 3);
});

test("client maps Slack-level ratelimited with retry_after", async () => {
  const fakeFetch = async () => ({
    status: 200, ok: true, headers: new Map(),
    json: async () => ({ ok: false, error: "ratelimited", retry_after: 2 })
  });
  const client = createSlackClient("xoxb-token", fakeFetch);
  await assert.rejects(() => client.api("conversations.list"), (e) => e.status === 429 && e.retryAfter === 2);
});

test("getActivity aggregates auth, channels, histories, and user names", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    const method = url.split("/").pop();
    calls.push(method);
    const body = Object.fromEntries(new URLSearchParams(opts.body));
    const ok = (extra = {}) => ({ status: 200, ok: true, headers: new Map(), json: async () => ({ ok: true, ...extra }) });
    if (method === "auth.test") return ok({ user: BOT, team: "acme", url: "https://acme.slack.com/" });
    if (method === "conversations.list") return ok({ channels: [channel(), { id: "CARCH", name: "old", is_archived: true }] });
    if (method === "conversations.history") return ok({ messages: [msg()] });
    if (method === "users.info") return ok({ user: { real_name: "Mira" } });
    throw new Error("unexpected call " + method + " " + JSON.stringify(body));
  };
  const client = createSlackClient("xoxb-token", fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.team, "acme");
  assert.equal(activity.feed.length, 1);
  assert.equal(activity.feed[0].channel, "eng-deploys");
  assert.match(activity.feed[0].title, /Mira/);
  assert.ok(calls.includes("auth.test") && calls.includes("conversations.list"));
  assert.ok(calls.includes("conversations.history") && calls.includes("users.info"));
});

test("getActivity tolerates a failing channel history", async () => {
  const fakeFetch = async (url) => {
    const method = url.split("/").pop();
    const ok = (extra = {}) => ({ status: 200, ok: true, headers: new Map(), json: async () => ({ ok: true, ...extra }) });
    if (method === "auth.test") return ok({ user: BOT, team: "acme", url: "https://acme.slack.com/" });
    if (method === "conversations.list") return ok({ channels: [channel()] });
    if (method === "conversations.history") return { status: 500, ok: false, headers: new Map(), json: async () => ({}) };
    if (method === "users.info") return ok({ user: { name: "mira" } });
    throw new Error("unexpected " + method);
  };
  const client = createSlackClient("xoxb-token", fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.feed.length, 0);
});
