"use strict";

const SLACK_API = "https://slack.com/api";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CHANNELS = 10;
const MAX_MESSAGES_PER_CHANNEL = 20;
const MAX_FEED_ITEMS = 25;

class SlackError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = "SlackError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function createSlackClient(token, fetchImpl = fetch) {
  if (!token) throw new SlackError("SLACK_BOT_TOKEN is not set", 501);

  async function api(method, params = {}) {
    const res = await fetchImpl(`${SLACK_API}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 429) {
      throw new SlackError("Slack API rate limit exceeded", 429, Number(res.headers.get("retry-after")) || 1);
    }
    if (res.status === 401) throw new SlackError("SLACK_BOT_TOKEN is invalid or expired", 401);
    if (!res.ok) throw new SlackError(`Slack API error ${res.status}`, res.status);
    const data = await res.json();
    if (!data.ok) {
      if (data.error === "invalid_auth") throw new SlackError("SLACK_BOT_TOKEN is invalid or expired", 401);
      if (data.error === "ratelimited") throw new SlackError("Slack API rate limit exceeded", 429, data.retry_after || 1);
      throw new SlackError(`Slack API error: ${data.error || "unknown"}`, 400);
    }
    return data;
  }

  async function getActivity() {
    const auth = await api("auth.test");
    const list = await api("conversations.list", { limit: "200", types: "public_channel,private_channel" });
    const channels = (list.channels || []).filter(c => !c.is_archived).slice(0, MAX_CHANNELS);
    const histories = await Promise.all(channels.map(async channel => {
      try {
        const h = await api("conversations.history", { channel: channel.id, limit: String(MAX_MESSAGES_PER_CHANNEL) });
        return { channel, messages: h.messages || [] };
      } catch (e) {
        return { channel, messages: [] };
      }
    }));
    const userIds = [...new Set(histories.flatMap(h => h.messages.map(m => m.user).filter(Boolean)))].slice(0, 20);
    const userNames = {};
    await Promise.all(userIds.map(async id => {
      try {
        const u = await api("users.info", { user: id });
        userNames[id] = (u.user && (u.user.real_name || u.user.name)) || id;
      } catch (e) {
        userNames[id] = id;
      }
    }));
    return {
      user: auth.user,
      team: auth.team,
      teamUrl: auth.url,
      feed: buildFeed(histories, auth.user, userNames, auth.url),
      fetchedAt: new Date().toISOString()
    };
  }

  return { api, getActivity };
}

function permalink(teamUrl, channelId, ts) {
  return `${String(teamUrl).replace(/\/$/, "")}/archives/${channelId}/p${String(ts).replace(".", "")}`;
}

function truncate(text, n = 140) {
  const clean = String(text || "")
    .replace(/<@([A-Z0-9]+)(\|[^>]*)?>/g, "@$1")
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, "#$2")
    .replace(/<([^|>]+)\|([^>]+)>/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

function buildFeed(histories, botUserId, userNames = {}, teamUrl = "https://slack.com") {
  const items = [];
  for (const { channel, messages } of histories) {
    for (const m of messages) {
      if (!m.text || !m.ts || m.user === botUserId) continue;
      const author = userNames[m.user] || m.user || "someone";
      const isMention = m.text.includes(`<@${botUserId}>`);
      items.push({
        c: "slack",
        kind: isMention ? "mention" : "message",
        title: isMention ? `@${author} mentioned you in #${channel.name}` : `#${channel.name}: ${author}`,
        desc: truncate(m.text),
        urgent: isMention,
        tag: isMention ? "action" : "",
        real: true,
        ref: permalink(teamUrl, channel.id, m.ts),
        channel: channel.name,
        author,
        ts: m.ts
      });
    }
  }
  items.sort((a, b) => Number(b.ts) - Number(a.ts));
  return items.slice(0, MAX_FEED_ITEMS);
}

module.exports = { createSlackClient, buildFeed, truncate, permalink, SlackError };
