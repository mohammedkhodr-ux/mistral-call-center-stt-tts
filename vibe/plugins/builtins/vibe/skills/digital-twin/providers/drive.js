"use strict";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_FILES = 15;
const LOOKBACK_DAYS = 7;

function createDriveClient(googleApi) {
  return {
    async getActivity() {
      const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
      const params = new URLSearchParams({
        q: `trashed = false and modifiedTime > '${since}'`,
        orderBy: "modifiedTime desc",
        pageSize: String(MAX_FILES),
        fields: "files(id,name,mimeType,modifiedTime,lastModifyingUser,webViewLink)"
      });
      const data = await googleApi(DRIVE_API, `/files?${params}`);
      return { feed: buildFeed(data.files || []), fetchedAt: new Date().toISOString() };
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

function mapFile(file, now = new Date()) {
  const modifier = (file.lastModifyingUser &&
    (file.lastModifyingUser.displayName || file.lastModifyingUser.emailAddress)) || "someone";
  return {
    c: "drive",
    kind: "file",
    title: file.name || "(unnamed)",
    desc: `Modified by ${modifier} · ${relative(file.modifiedTime, now)}`,
    urgent: false,
    tag: "",
    real: true,
    ref: file.webViewLink || "",
    id: file.id || ""
  };
}

function buildFeed(files, now = new Date()) {
  const seen = new Set();
  const feed = [];
  for (const f of files) {
    if (!f || !f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    feed.push(mapFile(f, now));
  }
  return feed;
}

module.exports = { createDriveClient, buildFeed, mapFile, relative, DRIVE_API };
