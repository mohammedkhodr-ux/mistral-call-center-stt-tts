"use strict";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_MESSAGES = 15;
const UNREAD_QUERY = "is:unread newer_than:7d";

class GmailError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GmailError";
    this.status = status;
  }
}

async function refreshAccessToken(fetchImpl, { clientId, clientSecret, refreshToken }) {
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) throw new GmailError("Failed to refresh Google access token — re-authorize", res.status === 400 ? 401 : res.status);
  const data = await res.json();
  if (!data.access_token) throw new GmailError("Google did not return an access token", 401);
  return data.access_token;
}

function createGmailClient(accessToken, fetchImpl = fetch, refresh = null) {
  if (!accessToken && !(refresh && refresh.refreshToken)) {
    throw new GmailError("GMAIL_ACCESS_TOKEN is not set (or provide Google refresh credentials)", 501);
  }
  let token = accessToken;
  let refreshing = null;

  async function getToken() {
    if (token) return token;
    if (!refreshing) {
      refreshing = refreshAccessToken(fetchImpl, refresh).then(t => { token = t; return t; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  async function api(path, isRetry = false) {
    const res = await fetchImpl(GMAIL_API + path, {
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 401 && !isRetry && refresh && refresh.refreshToken) {
      token = null;
      return api(path, true);
    }
    if (res.status === 401) throw new GmailError("GMAIL_ACCESS_TOKEN is invalid or expired — refresh it", 401);
    if (res.status === 429) throw new GmailError("Gmail API rate limit exceeded — try again later", 429);
    if (!res.ok) throw new GmailError(`Gmail API error ${res.status}`, res.status);
    return res.json();
  }

  return {
    api,
    async getActivity() {
      const profile = await api("/profile");
      const list = await api(`/messages?q=${encodeURIComponent(UNREAD_QUERY)}&maxResults=${MAX_MESSAGES}`);
      const messages = list.messages || [];
      const full = await Promise.all(messages.map(m => api(`/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`)));
      return {
        user: profile.emailAddress,
        feed: buildFeed(full),
        fetchedAt: new Date().toISOString()
      };
    }
  };
}

function header(msg, name) {
  const h = (msg.payload && msg.payload.headers || []).find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

function senderName(from) {
  const m = String(from).match(/^"?([^"<]+)"?\s*<[^>]+>$/);
  return m ? m[1].trim() : String(from).split("@")[0];
}

function senderEmail(from) {
  const m = String(from).match(/<([^>]+)>/);
  return m ? m[1] : String(from);
}

function truncate(text, n = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}

function messageLink(id) {
  return `https://mail.google.com/mail/u/0/#inbox/${id}`;
}

function mapMessage(msg) {
  const subject = header(msg, "Subject") || "(no subject)";
  const from = header(msg, "From");
  const date = header(msg, "Date");
  return {
    c: "gmail",
    kind: "email",
    title: subject,
    desc: `${senderName(from)} <${senderEmail(from)}> — ${truncate(msg.snippet || "")}`,
    urgent: true,
    tag: "action",
    real: true,
    ref: messageLink(msg.id),
    id: msg.id,
    from: senderEmail(from),
    fromName: senderName(from),
    subject,
    date
  };
}

function buildFeed(messages) {
  const seen = new Set();
  const feed = [];
  for (const msg of messages) {
    if (!msg || !msg.id || seen.has(msg.id)) continue;
    seen.add(msg.id);
    feed.push(mapMessage(msg));
  }
  return feed;
}

module.exports = { createGmailClient, refreshAccessToken, buildFeed, mapMessage, senderName, senderEmail, truncate, header, GmailError };
