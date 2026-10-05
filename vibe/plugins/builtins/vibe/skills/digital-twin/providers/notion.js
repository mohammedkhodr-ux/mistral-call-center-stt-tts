"use strict";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_PAGES = 15;

class NotionError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "NotionError";
    this.status = status;
  }
}

function createNotionClient(token, fetchImpl = fetch) {
  if (!token) throw new NotionError("NOTION_TOKEN is not set", 501);

  async function api(path, body) {
    const res = await fetchImpl(NOTION_API + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 401) throw new NotionError("NOTION_TOKEN is invalid — check the integration secret", 401);
    if (res.status === 429) throw new NotionError("Notion API rate limit exceeded — try again later", 429);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.object === "error") {
      throw new NotionError(data.message || `Notion API error ${res.status}`, res.ok ? 400 : res.status);
    }
    return data;
  }

  return {
    api,
    async getActivity() {
      const data = await api("/search", {
        page_size: MAX_PAGES,
        sort: { timestamp: "last_edited_time", direction: "descending" }
      });
      return { feed: buildFeed(data.results || []), fetchedAt: new Date().toISOString() };
    }
  };
}

function relative(iso, now = new Date()) {
  const mins = Math.floor((now.getTime() - Date.parse(iso)) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function pageTitle(page) {
  const props = page.properties || {};
  const titleProp = Object.values(props).find(p => p && p.type === "title");
  if (!titleProp || !Array.isArray(titleProp.title)) return "(untitled)";
  const t = titleProp.title.map(t => t.plain_text || "").join("").trim();
  return t || "(untitled)";
}

function mapPage(page, now = new Date()) {
  return {
    c: "notion",
    kind: "page",
    title: pageTitle(page),
    desc: `Edited ${relative(page.last_edited_time, now)} · ${(page.parent && page.parent.type) || "page"}`,
    urgent: false,
    tag: "",
    real: true,
    ref: page.url || "",
    id: page.id || ""
  };
}

function buildFeed(pages, now = new Date()) {
  const seen = new Set();
  const feed = [];
  for (const p of pages) {
    if (!p || !p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    feed.push(mapPage(p, now));
  }
  return feed;
}

module.exports = { createNotionClient, buildFeed, mapPage, pageTitle, relative, NotionError };
