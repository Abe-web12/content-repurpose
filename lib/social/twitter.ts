interface TwitterTokenResponse {
  token_type: "bearer";
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
}

interface TwitterPostResponse {
  data: {
    id: string;
    text: string;
  };
}

const TWITTER_API_BASE = "https://api.twitter.com/2";

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TwitterTokenResponse> {
  const credentials = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID || ""}:${process.env.TWITTER_CLIENT_SECRET || ""}`
  ).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token exchange failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TwitterTokenResponse> {
  const credentials = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID || ""}:${process.env.TWITTER_CLIENT_SECRET || ""}`
  ).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter token refresh failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function getMe(
  accessToken: string
): Promise<TwitterUserResponse> {
  const res = await fetch(`${TWITTER_API_BASE}/users/me?user.fields=profile_image_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Twitter user fetch failed: ${res.status}`);
  return res.json();
}

export async function createTweet(
  accessToken: string,
  text: string
): Promise<TwitterPostResponse> {
  const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twitter post failed: ${res.status} ${err}`);
  }
  return res.json();
}

export function getAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID || "",
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}
