---
name: digital-twin
description: "Load this skill when the user wants their personal digital twin console: a visual, interactive mini app that mirrors them across all their connectors (GitHub, Slack, Gmail, Calendar, Drive, Jira, Notion), shows a daily brief, live activity, and an action center, and lets them take actions for their role. Also load when the user asks to open, run, start, or serve the digital twin app."
user-invocable: true
---

# Digital Twin

A self-contained personal command center shipped as support files in this
directory. It is a single-page web app (`index.html`) plus a small Node/Express
backend (`server.js`) that talks to live provider APIs.

## What it is

- Visual, interactive dashboard: twin identity card, role-aware daily brief,
  stat tiles, per-connector panel, live activity feed, weekly chart
- Action Center: urgent items (PR review requests, @mentions, unread mail,
  imminent meetings, high-priority tickets) become actionable cards
- Timeline of everything the user and the twin have done; Focus Mode timer
- State persists in browser localStorage and syncs to the backend
- 7 live connectors: GitHub, Slack, Gmail, Calendar, Drive, Jira, Notion

## Files

```
SKILL.md          # this file
index.html        # the whole frontend (no build step)
server.js         # Express backend: static hosting + state API + provider sync
providers/              # one testable client per provider (github, slack, gmail,
                  #   googleAuth, calendar, drive, jira, notion)
test/             # node:test suites per client
package.json      # npm start / npm test
.env.example      # credential template (never commit a real .env)
README.md         # full docs
```

## Run it

From this directory:

```bash
npm install
npm start          # serves http://127.0.0.1:3777
```

Then open <http://127.0.0.1:3777>. The frontend also works standalone
(`index.html` via file://) with simulated connectors; the backend is what
makes connectors live.

## Connect credentials

Copy `.env.example` to `.env` in this directory and fill in what you have:

- `GITHUB_TOKEN` — fine-grained PAT, scopes `repo` + `read:user`
- `SLACK_BOT_TOKEN` — `xoxb-…`, scopes `channels:history`, `groups:history`, `users:read`
- `GMAIL_ACCESS_TOKEN` (short-lived) or `GMAIL_REFRESH_TOKEN` +
  `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (durable, auto-refreshing);
  Calendar and Drive share this Google auth (add `calendar.readonly` and
  `drive.metadata.readonly` scopes)
- `JIRA_BASE_URL` + `JIRA_EMAIL` + `JIRA_API_TOKEN`
- `NOTION_TOKEN` — internal integration secret, shared with the pages to see

Restart the server after editing `.env`. The UI shows which connectors are live
(⬢) vs simulated (○). Sync happens every 5 minutes and via the "Sync all
connectors" command (Ctrl/Cmd+K).

## Verify

```bash
npm test           # syntax checks + 64 unit tests across all provider clients
```

## Gotchas

- The server binds to `127.0.0.1` only — it is a personal local tool, not a
  public service. Do not expose it.
- Never commit `.env` or tokens; `data/store.json` is runtime state.
- Provider responses are cached server-side for 60s.
- If a provider returns 401, the error message says which credential to fix.
