"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createGmailClient,
  buildFeed,
  mapMessage,
  senderName,
  senderEmail,
  truncate,
  header,
  GmailError
} = require("../providers/gmail");

const messageFixture = (over = {}) => ({
  id: "18c1f2a3b4",
  snippet: "Can you send the Q3 numbers before EOD?",
  payload: {
    headers: [
      { name: "Subject", value: "Q3 numbers needed" },
      { name: "From", value: "Mira Chen <mira@acme.com>" },
      { name: "Date", value: "Mon, 6 Oct 2026 09:14:00 +0000" }
    ]
  },
  ...over
});

test("senderName extracts the display name", () => {
  assert.equal(senderName("Mira Chen <mira@acme.com>"), "Mira Chen");
  assert.equal(senderName('"Sam O\'Neil" <sam@acme.com>'), "Sam O'Neil");
  assert.equal(senderName("mira@acme.com"), "mira");
});

test("senderEmail extracts the address", () => {
  assert.equal(senderEmail("Mira Chen <mira@acme.com>"), "mira@acme.com");
  assert.equal(senderEmail("mira@acme.com"), "mira@acme.com");
});

test("truncate collapses whitespace and caps length", () => {
  assert.equal(truncate("a  b\n c"), "a b c");
  const long = "y".repeat(300);
  assert.equal(truncate(long).length, 160);
  assert.ok(truncate(long).endsWith("…"));
});

test("header lookup is case-insensitive", () => {
  const msg = messageFixture();
  assert.equal(header(msg, "subject"), "Q3 numbers needed");
  assert.equal(header(msg, "FROM"), "Mira Chen <mira@acme.com>");
  assert.equal(header(msg, "Reply-To"), "");
});

test("mapMessage marks unread mail urgent with a gmail link and ref", () => {
  const item = mapMessage(messageFixture());
  assert.equal(item.kind, "email");
  assert.equal(item.urgent, true);
  assert.equal(item.tag, "action");
  assert.equal(item.real, true);
  assert.equal(item.title, "Q3 numbers needed");
  assert.equal(item.from, "mira@acme.com");
  assert.equal(item.fromName, "Mira Chen");
  assert.equal(item.ref, "https://mail.google.com/mail/u/0/#inbox/18c1f2a3b4");
  assert.match(item.desc, /Mira Chen <mira@acme\.com>/);
  assert.match(item.desc, /Q3 numbers/);
});

test("mapMessage handles missing subject and plain-address From", () => {
  const item = mapMessage(messageFixture({
    payload: { headers: [{ name: "From", value: "billing@vendor.com" }] }
  }));
  assert.equal(item.title, "(no subject)");
  assert.equal(item.from, "billing@vendor.com");
  assert.equal(item.fromName, "billing");
});

test("buildFeed dedupes by message id", () => {
  const m = messageFixture();
  const feed = buildFeed([m, m, messageFixture({ id: "other" })]);
  assert.equal(feed.length, 2);
});

test("client rejects immediately without a token", () => {
  assert.throws(() => createGmailClient(""), /GMAIL_ACCESS_TOKEN is not set/);
});

test("client maps 401 to expired token", async () => {
  const fakeFetch = async () => ({ status: 401, ok: false, headers: new Map(), json: async () => ({}) });
  const client = createGmailClient("bad", fakeFetch);
  await assert.rejects(() => client.api("/profile"), (e) => e instanceof GmailError && e.status === 401);
});

test("client maps 429 to rate limit", async () => {
  const fakeFetch = async () => ({ status: 429, ok: false, headers: new Map(), json: async () => ({}) });
  const client = createGmailClient("token", fakeFetch);
  await assert.rejects(() => client.api("/profile"), /rate limit/);
});

test("getActivity fetches profile, lists unread, and loads each message", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    const ok = (extra = {}) => ({ status: 200, ok: true, headers: new Map(), json: async () => extra });
    if (url.endsWith("/profile")) return ok({ emailAddress: "you@acme.com" });
    if (url.includes("/messages?q=")) {
      assert.match(url, /is%3Aunread/);
      return ok({ messages: [{ id: "m1" }, { id: "m2" }] });
    }
    const id = url.match(/\/messages\/(m\d)/)[1];
    return ok(messageFixture({ id }));
  };
  const client = createGmailClient("token", fakeFetch);
  const activity = await client.getActivity();
  assert.equal(activity.user, "you@acme.com");
  assert.equal(activity.feed.length, 2);
  assert.equal(calls.length, 4);
  assert.ok(calls.some(u => u.includes(encodeURIComponent("is:unread"))));
  assert.ok(calls.filter(u => /\/messages\/m\d/.test(u)).length === 2);
});

test("client refreshes the token once on 401 when refresh credentials exist", async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push(url);
    if (url.includes("oauth2.googleapis.com/token")) {
      assert.equal(opts.method, "POST");
      const body = new URLSearchParams(opts.body);
      assert.equal(body.get("grant_type"), "refresh_token");
      return { status: 200, ok: true, headers: new Map(), json: async () => ({ access_token: "fresh-token" }) };
    }
    const auth = opts.headers.Authorization;
    if (auth === "Bearer stale-token") {
      return { status: 401, ok: false, headers: new Map(), json: async () => ({}) };
    }
    assert.equal(auth, "Bearer fresh-token");
    return { status: 200, ok: true, headers: new Map(), json: async () => ({ emailAddress: "you@acme.com" }) };
  };
  const refresh = { clientId: "id", clientSecret: "secret", refreshToken: "rt" };
  const client = createGmailClient("stale-token", fakeFetch, refresh);
  const activity = await client.getActivity();
  assert.equal(activity.user, "you@acme.com");
  assert.ok(calls.some(u => u.includes("oauth2.googleapis.com")));
});

test("client refreshes from refresh_token alone when no access token is given", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("oauth2.googleapis.com/token")) {
      return { status: 200, ok: true, headers: new Map(), json: async () => ({ access_token: "fresh" }) };
    }
    return { status: 200, ok: true, headers: new Map(), json: async () => ({ emailAddress: "you@acme.com", messages: [] }) };
  };
  const refresh = { clientId: "id", clientSecret: "secret", refreshToken: "rt" };
  const client = createGmailClient(null, fakeFetch, refresh);
  const activity = await client.getActivity();
  assert.equal(activity.user, "you@acme.com");
});

test("refresh failure surfaces as an auth error", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("oauth2.googleapis.com/token")) {
      return { status: 400, ok: false, headers: new Map(), json: async () => ({ error: "invalid_grant" }) };
    }
    return { status: 401, ok: false, headers: new Map(), json: async () => ({}) };
  };
  const refresh = { clientId: "id", clientSecret: "secret", refreshToken: "rt" };
  const client = createGmailClient(null, fakeFetch, refresh);
  await assert.rejects(() => client.getActivity(), (e) => e instanceof GmailError && e.status === 401);
});

test("getActivity returns an empty feed when there is no unread mail", async () => {
  const fakeFetch = async (url) => {
    const ok = (extra = {}) => ({ status: 200, ok: true, headers: new Map(), json: async () => extra });
    if (url.endsWith("/profile")) return ok({ emailAddress: "you@acme.com" });
    return ok({});
  };
  const client = createGmailClient("token", fakeFetch);
  const activity = await client.getActivity();
  assert.deepEqual(activity.feed, []);
});
