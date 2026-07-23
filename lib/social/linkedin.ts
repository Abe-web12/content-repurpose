const LINKEDIN_API_VERSION = "202304";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

interface LinkedInProfileResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

interface LinkedInPostResult {
  id: string;
  activity: string;
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token exchange failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<LinkedInTokenResponse> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID || "",
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token refresh failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function getProfile(
  accessToken: string
): Promise<LinkedInProfileResponse> {
  const res = await fetch(
    "https://api.linkedin.com/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": LINKEDIN_API_VERSION,
      },
    }
  );
  if (!res.ok) throw new Error(`LinkedIn profile fetch failed: ${res.status}`);
  return res.json();
}

export async function createPost(
  accessToken: string,
  authorUrn: string,
  content: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC"
): Promise<LinkedInPostResult> {
  const body = {
    author: `urn:li:person:${authorUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": visibility,
    },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn post failed: ${res.status} ${err}`);
  }

  return res.json();
}

export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID || "",
    redirect_uri: redirectUri,
    state,
    scope: "openid profile email w_member_social",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}
