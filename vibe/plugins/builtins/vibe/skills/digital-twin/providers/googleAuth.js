"use strict";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 8000;

class GoogleAuthError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GoogleAuthError";
    this.status = status;
  }
}

async function refreshAccessToken(fetchImpl, { clientId, clientSecret, refreshToken }) {
  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
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
  if (!res.ok) {
    throw new GoogleAuthError("Failed to refresh Google access token — re-authorize", res.status === 400 ? 401 : res.status);
  }
  const data = await res.json();
  if (!data.access_token) throw new GoogleAuthError("Google did not return an access token", 401);
  return data.access_token;
}

function createGoogleCaller({ accessToken, refresh = null, fetchImpl = fetch } = {}) {
  if (!accessToken && !(refresh && refresh.refreshToken)) {
    throw new GoogleAuthError("Google credentials are not set", 501);
  }
  let token = accessToken;
  let refreshing = null;

  async function getToken() {
    if (token) return token;
    if (!refreshing) {
      refreshing = refreshAccessToken(fetchImpl, refresh)
        .then(t => { token = t; return t; })
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }

  return async function api(baseUrl, path, isRetry = false) {
    const res = await fetchImpl(baseUrl + path, {
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (res.status === 401 && !isRetry && refresh && refresh.refreshToken) {
      token = null;
      return api(baseUrl, path, true);
    }
    if (res.status === 401) throw new GoogleAuthError("Google access token is invalid or expired — refresh it", 401);
    if (res.status === 429) throw new GoogleAuthError("Google API rate limit exceeded — try again later", 429);
    if (!res.ok) throw new GoogleAuthError(`Google API error ${res.status}`, res.status);
    return res.json();
  };
}

module.exports = { createGoogleCaller, refreshAccessToken, GoogleAuthError };
