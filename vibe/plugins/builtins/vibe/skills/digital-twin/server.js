"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { createGitHubClient, GitHubError } = require("./providers/github");
const { createSlackClient, SlackError } = require("./providers/slack");
const { createGmailClient } = require("./providers/gmail");
const { createGoogleCaller } = require("./providers/googleAuth");
const { createCalendarClient } = require("./providers/calendar");
const { createDriveClient } = require("./providers/drive");
const { createJiraClient } = require("./providers/jira");
const { createNotionClient } = require("./providers/notion");

const PROVIDER_CACHE_MS = 60 * 1000;
const providerCache = new Map();

function cached(key, fn) {
  return async (req, res) => {
    try {
      const hit = providerCache.get(key);
      if (hit && Date.now() < hit.expires) return res.json({ ...hit.data, cached: true });
      const data = await fn();
      providerCache.set(key, { data, expires: Date.now() + PROVIDER_CACHE_MS });
      res.json(data);
    } catch (e) {
      const status = e.status || 500;
      res.status(status).json({ ok: false, error: e.message });
    }
  };
}

const app = express();
const PORT = process.env.PORT || 3777;
const DATA_FILE = path.join(__dirname, "data", "store.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return {};
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "digital-twin-backend", time: new Date().toISOString() });
});

app.get("/api/state", (req, res) => {
  res.json({ twin: readStore(), connectors: connectorStatus() });
});

app.post("/api/state", (req, res) => {
  const store = readStore();
  const incoming = req.body || {};
  store[incoming.key || "default"] = incoming.value;
  store.updatedAt = new Date().toISOString();
  writeStore(store);
  res.json({ ok: true });
});

app.delete("/api/state/:key", (req, res) => {
  const store = readStore();
  delete store[req.params.key];
  writeStore(store);
  res.json({ ok: true });
});

app.get("/api/connectors", (req, res) => {
  res.json(connectorStatus());
});

function connectorStatus() {
  const configured = (name) => Boolean(process.env[name]);
  return [
    { id: "gmail",    name: "Gmail",    connected: configured("GMAIL_ACCESS_TOKEN") || (configured("GMAIL_REFRESH_TOKEN") && configured("GOOGLE_CLIENT_ID")), note: (configured("GMAIL_ACCESS_TOKEN") || (configured("GMAIL_REFRESH_TOKEN") && configured("GOOGLE_CLIENT_ID"))) ? "credentials present" : "set GMAIL_ACCESS_TOKEN, or GMAIL_REFRESH_TOKEN + GOOGLE_CLIENT_ID/SECRET" },
    { id: "slack",    name: "Slack",    connected: configured("SLACK_BOT_TOKEN"),    note: configured("SLACK_BOT_TOKEN") ? "credentials present" : "set SLACK_BOT_TOKEN to connect" },
    { id: "calendar", name: "Calendar", connected: configured("GMAIL_ACCESS_TOKEN") || (configured("GMAIL_REFRESH_TOKEN") && configured("GOOGLE_CLIENT_ID")), note: "shares Google auth with Gmail — set GMAIL_ACCESS_TOKEN or GMAIL_REFRESH_TOKEN + GOOGLE_CLIENT_ID/SECRET" },
    { id: "github",   name: "GitHub",   connected: configured("GITHUB_TOKEN"),       note: configured("GITHUB_TOKEN") ? "credentials present" : "set GITHUB_TOKEN to connect" },
    { id: "jira",     name: "Jira",     connected: configured("JIRA_API_TOKEN") && configured("JIRA_EMAIL") && configured("JIRA_BASE_URL"), note: (configured("JIRA_API_TOKEN") && configured("JIRA_EMAIL") && configured("JIRA_BASE_URL")) ? "credentials present" : "set JIRA_BASE_URL + JIRA_EMAIL + JIRA_API_TOKEN to connect" },
    { id: "drive",    name: "Drive",    connected: configured("GMAIL_ACCESS_TOKEN") || (configured("GMAIL_REFRESH_TOKEN") && configured("GOOGLE_CLIENT_ID")), note: "shares Google auth with Gmail" },
    { id: "notion",   name: "Notion",   connected: configured("NOTION_TOKEN"),       note: configured("NOTION_TOKEN") ? "credentials present" : "set NOTION_TOKEN to connect" }
  ];
}

app.post("/api/connectors/:id/sync", (req, res) => {
  const status = connectorStatus().find(c => c.id === req.params.id);
  if (!status) return res.status(404).json({ ok: false, error: "unknown connector" });
  if (!status.connected) {
    return res.status(501).json({ ok: false, error: `${status.name} is not connected — ${status.note}` });
  }
  if (status.id === "github") return githubActivity(req, res);
  if (status.id === "slack") return slackActivity(req, res);
  if (status.id === "gmail") return gmailActivity(req, res);
  if (status.id === "calendar") return calendarActivity(req, res);
  if (status.id === "drive") return driveActivity(req, res);
  if (status.id === "jira") return jiraActivity(req, res);
  if (status.id === "notion") return notionActivity(req, res);
  res.status(404).json({ ok: false, error: "unknown connector" });
});

const githubActivity = cached("github", () =>
  createGitHubClient(process.env.GITHUB_TOKEN).getActivity()
);
const slackActivity = cached("slack", () =>
  createSlackClient(process.env.SLACK_BOT_TOKEN).getActivity()
);

const gmailClient = () => createGmailClient(
  process.env.GMAIL_ACCESS_TOKEN || null,
  fetch,
  (process.env.GMAIL_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) ? {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
  } : null
);
const gmailActivity = cached("gmail", () => gmailClient().getActivity());

app.get("/api/github/activity", githubActivity);
app.get("/api/slack/activity", slackActivity);
app.get("/api/gmail/activity", gmailActivity);

const googleRefresh = () =>
  (process.env.GMAIL_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) ? {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
  } : null;

const googleApi = () => createGoogleCaller({
  accessToken: process.env.GMAIL_ACCESS_TOKEN || null,
  refresh: googleRefresh(),
  fetchImpl: fetch
});

const calendarActivity = cached("calendar", () => createCalendarClient(googleApi()).getActivity());
const driveActivity = cached("drive", () => createDriveClient(googleApi()).getActivity());
const jiraActivity = cached("jira", () =>
  createJiraClient({
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN
  }).getActivity()
);
const notionActivity = cached("notion", () =>
  createNotionClient(process.env.NOTION_TOKEN).getActivity()
);

app.get("/api/calendar/activity", calendarActivity);
app.get("/api/drive/activity", driveActivity);
app.get("/api/jira/activity", jiraActivity);
app.get("/api/notion/activity", notionActivity);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Digital twin backend on http://127.0.0.1:${PORT}`);
  console.log("Open http://127.0.0.1:" + PORT + "/ to use the app.");
});
