"use strict";

const GITHUB_API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 8000;

class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function createGitHubClient(token, fetchImpl = fetch) {
  if (!token) throw new GitHubError("GITHUB_TOKEN is not set", 501);

  async function api(path) {
    const res = await fetchImpl(GITHUB_API + path, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "digital-twin-app"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 401) throw new GitHubError("GITHUB_TOKEN is invalid or expired", 401);
    if (res.status === 403) {
      if (res.headers.get("x-ratelimit-remaining") === "0") {
        throw new GitHubError("GitHub API rate limit exceeded — try again later", 403);
      }
      throw new GitHubError("GitHub API forbidden — check token scopes (repo, read:user)", 403);
    }
    if (!res.ok) throw new GitHubError(`GitHub API error ${res.status}`, res.status);
    return res.json();
  }

  async function search(query) {
    const q = encodeURIComponent(`${query} is:open`);
    const data = await api(`/search/issues?q=${q}&per_page=10&sort=updated`);
    return data.items || [];
  }

  return {
    api,
    async getActivity() {
      const me = await api("/user");
      const [reviews, assigned, mentions] = await Promise.all([
        search("type:pr review-requested:@me"),
        search("assignee:@me"),
        search("mentions:@me")
      ]);
      return {
        user: me.login,
        feed: buildFeed(reviews, assigned, mentions),
        fetchedAt: new Date().toISOString()
      };
    }
  };
}

function repoFrom(item) {
  return (item.repository_url || "").split("/repos/")[1] || "";
}

function mapReviewRequest(pr) {
  return {
    c: "github",
    kind: "review",
    title: `Review requested: ${pr.title}`,
    desc: `${pr.html_url} — #${pr.number} by @${pr.user && pr.user.login}${pr.draft ? " (draft)" : ""}`,
    urgent: !pr.draft,
    tag: "action",
    real: true,
    ref: pr.html_url,
    number: pr.number,
    repo: repoFrom(pr)
  };
}

function mapAssigned(item) {
  const isPR = Boolean(item.pull_request);
  return {
    c: "github",
    kind: "assigned",
    title: `${isPR ? "PR" : "Issue"} assigned to you: ${item.title}`,
    desc: `${item.html_url} — #${item.number} in ${repoFrom(item)}`,
    urgent: false,
    tag: "",
    real: true,
    ref: item.html_url,
    number: item.number,
    repo: repoFrom(item)
  };
}

function mapMention(item) {
  const isPR = Boolean(item.pull_request);
  return {
    c: "github",
    kind: "mention",
    title: `${isPR ? "PR" : "Issue"} mentions you: ${item.title}`,
    desc: `${item.html_url} — #${item.number} by @${item.user && item.user.login}`,
    urgent: false,
    tag: "",
    real: true,
    ref: item.html_url,
    number: item.number,
    repo: repoFrom(item)
  };
}

function buildFeed(reviews, assigned, mentions) {
  const seen = new Set();
  const feed = [];
  const push = (item) => {
    if (!seen.has(item.ref)) {
      seen.add(item.ref);
      feed.push(item);
    }
  };
  reviews.forEach(pr => push(mapReviewRequest(pr)));
  assigned.forEach(item => push(mapAssigned(item)));
  mentions.forEach(item => push(mapMention(item)));
  return feed;
}

module.exports = { createGitHubClient, buildFeed, mapReviewRequest, mapAssigned, mapMention, GitHubError };
