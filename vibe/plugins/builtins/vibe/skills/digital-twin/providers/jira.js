"use strict";

const REQUEST_TIMEOUT_MS = 8000;
const MAX_ISSUES = 15;

class JiraError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "JiraError";
    this.status = status;
  }
}

const URGENT_PRIORITIES = new Set(["blocker", "critical", "highest", "high"]);

function createJiraClient({ baseUrl, email, apiToken } = {}, fetchImpl = fetch) {
  if (!baseUrl || !email || !apiToken) {
    throw new JiraError("JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN are all required", 501);
  }
  const base = String(baseUrl).replace(/\/$/, "");
  const auth = "Basic " + Buffer.from(`${email}:${apiToken}`).toString("base64");

  async function api(path) {
    const res = await fetchImpl(base + path, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 401 || res.status === 403) {
      throw new JiraError("Jira authentication failed — check JIRA_EMAIL and JIRA_API_TOKEN", 401);
    }
    if (res.status === 429) throw new JiraError("Jira API rate limit exceeded — try again later", 429);
    if (!res.ok) throw new JiraError(`Jira API error ${res.status}`, res.status);
    return res.json();
  }

  return {
    api,
    async getActivity() {
      const jql = encodeURIComponent("assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC");
      const data = await api(`/rest/api/3/search?jql=${jql}&maxResults=${MAX_ISSUES}&fields=summary,status,priority,duedate,updated`);
      return { feed: buildFeed(data.issues || [], base), fetchedAt: new Date().toISOString() };
    }
  };
}

function mapIssue(issue, base) {
  const f = issue.fields || {};
  const priorityName = (f.priority && f.priority.name) || "";
  const priority = priorityName || "—";
  const status = (f.status && f.status.name) || "—";
  const urgent = URGENT_PRIORITIES.has(priorityName.toLowerCase());
  return {
    c: "jira",
    kind: "ticket",
    title: `${issue.key}: ${f.summary || "(no summary)"}`,
    desc: `${status} · priority ${priority}${f.duedate ? " · due " + f.duedate : ""}`,
    urgent,
    tag: urgent ? "action" : "",
    real: true,
    ref: `${base}/browse/${issue.key}`,
    key: issue.key
  };
}

function buildFeed(issues, base) {
  const seen = new Set();
  const feed = [];
  for (const issue of issues) {
    if (!issue || !issue.key || seen.has(issue.key)) continue;
    seen.add(issue.key);
    feed.push(mapIssue(issue, base));
  }
  return feed;
}

module.exports = { createJiraClient, buildFeed, mapIssue, JiraError };
