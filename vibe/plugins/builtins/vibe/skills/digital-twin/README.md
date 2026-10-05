# Digital Twin Console

A personal, visual, interactive command center that mirrors you across your
connectors (Gmail, Slack, Calendar, GitHub, Jira, Drive, Notion).

## Run

```bash
npm install
npm start          # serves the app + API on http://127.0.0.1:3777
```

Then open <http://127.0.0.1:3777>.

The frontend is a single self-contained page (`index.html`) with no build step.
State persists in the browser (localStorage) and can also be synced to the
backend (`POST /api/state`).

## Backend API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/state` | Read all saved twin state |
| POST | `/api/state` | Save a key: `{ "key": "...", "value": {...} }` |
| DELETE | `/api/state/:key` | Delete a saved key |
| GET | `/api/connectors` | Connector connection status |
| POST | `/api/connectors/:id/sync` | Trigger a sync (all 7 connectors live) |
| GET | `/api/github/activity` | Live feed: PRs requesting your review, issues assigned/mentioning you |
| GET | `/api/slack/activity` | Live feed: recent channel messages, with @mentions of you flagged urgent |
| GET | `/api/gmail/activity` | Live feed: unread mail from the last 7 days |
| GET | `/api/calendar/activity` | Live feed: upcoming events (next 7 days; <60 min out = urgent) |
| GET | `/api/drive/activity` | Live feed: files modified in the last 7 days |
| GET | `/api/jira/activity` | Live feed: unresolved issues assigned to you (High+ = urgent) |
| GET | `/api/notion/activity` | Live feed: recently edited pages shared with the integration |

## Slack (live)

Set `SLACK_BOT_TOKEN` in `.env` (a bot token `xoxb-…` with scopes
`channels:history`, `groups:history`, `users:read`). The server reads the 10
most recent non-archived channels, fetches the latest messages from each,
resolves user names, and flags messages mentioning your bot as urgent.
Mentions auto-create action cards in the Action Center.

## GitHub (live)

Set `GITHUB_TOKEN` in `.env` (a fine-grained PAT with `repo` + `read:user` scopes).
The server polls `api.github.com` for:

- PRs with `review-requested:@me`
- issues/PRs with `assignee:@me`
- issues/PRs with `mentions:@me`

Responses are cached server-side for 60s. The frontend merges live items into the
activity feed and auto-creates action cards for PRs requesting your review.
The frontend re-polls every 5 minutes and on "Sync all connectors".

## Gmail (live)

Two ways to authenticate in `.env`:

1. **Simple:** `GMAIL_ACCESS_TOKEN=<oauth2 access token>` (scope `gmail.readonly`).
   Short-lived — expires in ~1h.
2. **Durable:** `GMAIL_REFRESH_TOKEN` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
   The server refreshes access tokens automatically, including a transparent
   retry when a stale token gets a 401.

The server lists unread messages from the last 7 days (`is:unread newer_than:7d`),
fetches subject/from/date for each, and marks them urgent in the feed.
Each unread email auto-creates an action card in the Action Center.

To get a refresh token, run a one-time OAuth2 consent flow (e.g. via
`https://developers.google.com/oauthplayground`) and copy the refresh token.

## Calendar & Drive (live)

Share the same Google auth as Gmail — set `GMAIL_ACCESS_TOKEN` (or the
refresh trio) and add scopes `calendar.readonly` and `drive.metadata.readonly`
to the consent flow. Calendar lists events for the next 7 days (events under
60 minutes away are urgent and spawn action cards). Drive lists files modified
in the last 7 days.

## Jira (live)

Set `JIRA_BASE_URL` (e.g. `https://you.atlassian.net`), `JIRA_EMAIL`, and
`JIRA_API_TOKEN` (an Atlassian API token). Lists your unresolved assigned
issues, highest priority first; High/Critical/Blocker are urgent and spawn
action cards.

## Notion (live)

Set `NOTION_TOKEN` (an internal integration secret `secret_…`). The
integration must be shared with the pages/databases you want to see.
Lists recently edited pages.

## Tests

```bash
npm test
```

## Connecting real providers

Create a `.env` (never commit it) and fill in credentials:

```
GOOGLE_CLIENT_ID=...        # Gmail / Calendar / Drive (OAuth)
GOOGLE_CLIENT_SECRET=...
SLACK_BOT_TOKEN=xoxb-...    # Slack
GITHUB_TOKEN=ghp_...        # GitHub
GMAIL_ACCESS_TOKEN=...      # Gmail (short-lived), or use refresh flow below
GMAIL_REFRESH_TOKEN=...     # Gmail durable auth (with GOOGLE_CLIENT_ID/SECRET)
JIRA_BASE_URL=https://you.atlassian.net
JIRA_EMAIL=you@acme.com     # Jira
JIRA_API_TOKEN=...          # Jira
NOTION_TOKEN=secret_...     # Notion
```

The server binds to `127.0.0.1` only — it is not exposed publicly.
`/api/connectors` reports which connectors have credentials; sync endpoints
return `501` with instructions until a provider is connected.

## Layout

- `index.html` — the whole app (UI + logic, no build)
- `server.js` — Express backend: static hosting + state API + connector status
- `lib/` — one testable client per provider (`github`, `slack`, `gmail`,
  `googleAuth`, `calendar`, `drive`, `jira`, `notion`)
- `test/` — node:test suites per client (`npm test`, 64 tests)
- `data/store.json` — backend-side persisted state (gitignored)

## Status

All 7 connectors are live: GitHub, Slack, Gmail, Calendar, Drive, Jira, Notion.
The frontend polls every provider every 5 minutes and merges results into the
activity feed; urgent items (review requests, @mentions, unread mail, imminent
events, high-priority tickets) auto-create action cards.
