export type IntegrationStatus = "connected" | "disconnected" | "beta" | "coming_soon" | "deprecated";

export interface SetupStep {
  title: string;
  description: string;
}

export interface RateLimit {
  limit: string;
  window: string;
}

export interface IntegrationFormField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "url";
  required: boolean;
}

export interface Integration {
  slug: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  status: IntegrationStatus;
  documentationUrl: string;
  website: string;
  pricing: string;
  apiVersion: string;
  supportedFeatures: string[];
  permissions: string[];
  requiredScopes: string[];
  setupSteps: SetupStep[];
  rateLimits: RateLimit[];
  webhooksSupported: boolean;
  oauthSupported: boolean;
  apiKeySupported: boolean;
  formFields: IntegrationFormField[];
}

export const INTEGRATIONS: Record<string, Integration> = {
  linkedin: {
    slug: "linkedin",
    name: "LinkedIn",
    category: "Social Media",
    description: "Auto-post text updates, articles, and carousel posts directly to LinkedIn.",
    longDescription:
      "Seamlessly publish and schedule content across LinkedIn Company Pages and personal profiles. RepurposeAI integrates with LinkedIn's Marketing and Share APIs to deliver text posts, document carousels, and article publications. Track engagement metrics like impressions, clicks, and interactions directly from your dashboard.",
    icon: "Linkedin",
    color: "#0A66C2",
    status: "connected",
    documentationUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
    website: "https://www.linkedin.com",
    pricing: "Free",
    apiVersion: "v2",
    supportedFeatures: [
      "Auto-publish text updates",
      "Document carousel posts",
      "Article publishing",
      "Scheduled posting",
      "Engagement analytics",
      "Multi-page support",
    ],
    permissions: [
      "r_liteprofile",
      "r_emailaddress",
      "w_member_social",
      "rw_organization_admin",
      "w_organization_social",
    ],
    requiredScopes: [
      "openid",
      "profile",
      "email",
      "w_member_social",
      "w_organization_social",
    ],
    setupSteps: [
      {
        title: "Create a LinkedIn App",
        description:
          "Go to the LinkedIn Developer Portal and create a new application to obtain your API credentials.",
      },
      {
        title: "Configure OAuth 2.0",
        description:
          "Set your OAuth redirect URI to the RepurposeAI callback URL and request the required permissions.",
      },
      {
        title: "Connect Your Account",
        description:
          "Authorize RepurposeAI to access your LinkedIn account by signing in through the OAuth flow.",
      },
      {
        title: "Select Pages",
        description:
          "Choose which LinkedIn Company Pages or your personal profile to connect for content publishing.",
      },
    ],
    rateLimits: [
      { limit: "100 requests/day", window: "Per user" },
      { limit: "10,000 requests/day", window: "Per app" },
      { limit: "1 post/10 seconds", window: "Per page" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Enter your LinkedIn Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter your LinkedIn Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "Paste your OAuth access token", type: "password", required: false },
      { key: "organizationId", label: "Organization ID", placeholder: "LinkedIn Page ID (optional)", type: "text", required: false },
    ],
  },

  twitter: {
    slug: "twitter",
    name: "Twitter / X",
    category: "Social Media",
    description: "Auto-publish threads, single tweets, and media-rich posts with scheduled delivery.",
    longDescription:
      "RepurposeAI's X integration enables automated tweeting, thread creation, and media attachment posting. Transform long-form content into engaging Twitter threads automatically. Schedule posts for optimal engagement times and monitor performance with built-in analytics.",
    icon: "Twitter",
    color: "#1DA1F2",
    status: "connected",
    documentationUrl: "https://developer.twitter.com/en/docs",
    website: "https://x.com",
    pricing: "Free",
    apiVersion: "v2",
    supportedFeatures: [
      "Single tweet publishing",
      "Thread creation from long content",
      "Media attachments (images, video)",
      "Scheduled posting",
      "Engagement analytics",
      "Poll creation",
    ],
    permissions: [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
      "media.write",
    ],
    requiredScopes: [
      "tweet.read",
      "tweet.write",
      "users.read",
      "offline.access",
    ],
    setupSteps: [
      {
        title: "Apply for X API Access",
        description:
          "Register for a Developer account on the X Developer Portal and create a project with Essential or Elevated access.",
      },
      {
        title: "Generate API Keys",
        description:
          "Create your API Key, API Secret, Bearer Token, and Access Token from the Developer Portal.",
      },
      {
        title: "Configure OAuth 1.0a / 2.0",
        description:
          "Set up OAuth 1.0a (user-context) or OAuth 2.0 (PKCE) with the appropriate callback URL from RepurposeAI.",
      },
      {
        title: "Authorize RepurposeAI",
        description:
          "Complete the OAuth flow to grant RepurposeAI write access to your X account.",
      },
    ],
    rateLimits: [
      { limit: "300 posts/day", window: "Per user (Essential)" },
      { limit: "1,000 posts/day", window: "Per user (Elevated)" },
      { limit: "50 posts/15 min", window: "Per user" },
      { limit: "900 requests/15 min", window: "Per app" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "API Key", placeholder: "Enter your X API Key", type: "text", required: true },
      { key: "apiSecret", label: "API Secret", placeholder: "Enter your X API Secret", type: "password", required: true },
      { key: "bearerToken", label: "Bearer Token", placeholder: "Enter your Bearer Token", type: "password", required: false },
      { key: "accessToken", label: "Access Token", placeholder: "Enter your Access Token", type: "password", required: true },
      { key: "accessTokenSecret", label: "Access Token Secret", placeholder: "Enter your Access Token Secret", type: "password", required: true },
    ],
  },

  youtube: {
    slug: "youtube",
    name: "YouTube",
    category: "Video",
    description: "Import video transcripts and auto-generate short-form clips for your channel.",
    longDescription:
      "RepurposeAI's YouTube integration unlocks powerful content repurposing workflows. Import video transcripts for text-based content generation, auto-create short-form clips from long videos, and publish content directly to your YouTube channel with optimized metadata.",
    icon: "Youtube",
    color: "#FF0000",
    status: "connected",
    documentationUrl: "https://developers.google.com/youtube/v3",
    website: "https://youtube.com",
    pricing: "Free (quota-based)",
    apiVersion: "v3",
    supportedFeatures: [
      "Transcript import for repurposing",
      "Auto-short clipping",
      "Video publishing with metadata",
      "Playlist management",
      "Analytics and performance data",
      "Comment moderation",
    ],
    permissions: [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtubepartner",
    ],
    requiredScopes: [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    setupSteps: [
      {
        title: "Enable YouTube Data API v3",
        description:
          "Go to the Google Cloud Console, create or select a project, and enable the YouTube Data API v3.",
      },
      {
        title: "Create OAuth 2.0 Credentials",
        description:
          "Create OAuth 2.0 credentials with the Application type set to Web Application. Add RepurposeAI's redirect URIs.",
      },
      {
        title: "Configure Consent Screen",
        description:
          "Set up the OAuth consent screen with the required YouTube scopes and your application details.",
      },
      {
        title: "Connect & Authorize",
        description:
          "Authorize RepurposeAI to access your YouTube channel. Verify the channel ownership and select which channels to manage.",
      },
    ],
    rateLimits: [
      { limit: "10,000 quota units/day", window: "Per project" },
      { limit: "1 request/second", window: "Per user" },
      { limit: "3,000 requests/100 sec", window: "Per project" },
    ],
    webhooksSupported: false,
    oauthSupported: true,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "API Key", placeholder: "Enter your YouTube API Key", type: "password", required: true },
      { key: "clientId", label: "Client ID", placeholder: "Enter your OAuth Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Enter your OAuth Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "OAuth 2.0 access token", type: "password", required: false },
      { key: "refreshToken", label: "Refresh Token", placeholder: "OAuth 2.0 refresh token", type: "password", required: false },
    ],
  },

  wordpress: {
    slug: "wordpress",
    name: "WordPress",
    category: "CMS",
    description: "Publish blog posts directly with categories, tags, featured images, and custom post types.",
    longDescription:
      "Connect RepurposeAI to your WordPress site using the REST API for seamless content publishing. Supports standard posts, custom post types, categories, tags, featured images, and custom fields. Ideal for automating your content calendar across multiple WordPress installations.",
    icon: " Globe",
    color: "#21759B",
    status: "connected",
    documentationUrl: "https://developer.wordpress.org/rest-api/",
    website: "https://wordpress.org",
    pricing: "Free",
    apiVersion: "v2 (WP REST API)",
    supportedFeatures: [
      "Post and page publishing",
      "Custom post type support",
      "Category and tag management",
      "Featured image uploads",
      "Custom fields (ACF compatible)",
      "Multi-site support",
    ],
    permissions: [
      "posts",
      "pages",
      "media",
      "categories",
      "tags",
      "custom_fields",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Generate Application Password",
        description:
          "In your WordPress admin panel, navigate to Users > Profile and generate a new Application Password.",
      },
      {
        title: "Find Your Site URL",
        description:
          "Determine the base URL of your WordPress site (e.g., https://yoursite.com) with the REST API base path.",
      },
      {
        title: "Enter Credentials",
        description:
          "Enter your WordPress site URL and the Application Password in the RepurposeAI configuration form.",
      },
      {
        title: "Verify Connection",
        description:
          "Test the connection to ensure RepurposeAI can access your WordPress site and list available post types.",
      },
    ],
    rateLimits: [
      { limit: "No hard limit", window: "Depends on hosting" },
      { limit: "Threaded requests", window: "10 concurrent" },
    ],
    webhooksSupported: true,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "siteUrl", label: "Site URL", placeholder: "https://yoursite.com", type: "url", required: true },
      { key: "apiKey", label: "Application Password", placeholder: "WordPress Application Password", type: "password", required: true },
      { key: "workspaceId", label: "Username", placeholder: "WordPress admin username", type: "text", required: true },
    ],
  },

  facebook: {
    slug: "facebook",
    name: "Facebook",
    category: "Social Media",
    description: "Publish posts, share media, and manage content across Facebook Pages and Groups.",
    longDescription:
      "RepurposeAI integrates with the Facebook Graph API to publish text posts, photos, videos, and links to your Facebook Pages and Groups. Schedule content for optimal reach and track engagement with detailed performance metrics.",
    icon: "Facebook",
    color: "#1877F2",
    status: "beta",
    documentationUrl: "https://developers.facebook.com/docs/graph-api",
    website: "https://www.facebook.com",
    pricing: "Free",
    apiVersion: "v19.0",
    supportedFeatures: [
      "Page post publishing",
      "Group posting",
      "Media uploads (photo, video)",
      "Link sharing with previews",
      "Scheduled posting",
      "Engagement analytics",
    ],
    permissions: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "publish_to_groups",
      "business_management",
    ],
    requiredScopes: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
    ],
    setupSteps: [
      {
        title: "Create a Facebook App",
        description:
          "Visit the Facebook Developer portal and create a new app with the Pages API product enabled.",
      },
      {
        title: "Configure App Settings",
        description:
          "Add RepurposeAI's OAuth redirect URI to your app's Valid OAuth Redirect URIs in Facebook App settings.",
      },
      {
        title: "Submit for Review (if needed)",
        description:
          "Some permissions require Facebook App Review. Submit your use case for approval.",
      },
      {
        title: "Connect Your Pages",
        description:
          "Authorize RepurposeAI and select which Facebook Pages you want to manage content for.",
      },
    ],
    rateLimits: [
      { limit: "200 posts/day", window: "Per page" },
      { limit: "600 requests/600 sec", window: "Per app per user" },
      { limit: "200 requests/600 sec", window: "Per page" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "appId", label: "App ID", placeholder: "Facebook App ID", type: "text", required: true },
      { key: "appSecret", label: "App Secret", placeholder: "Facebook App Secret", type: "password", required: true },
      { key: "accessToken", label: "Page Access Token", placeholder: "Long-lived Page Access Token", type: "password", required: true },
      { key: "pageId", label: "Page ID", placeholder: "Facebook Page ID", type: "text", required: true },
    ],
  },

  instagram: {
    slug: "instagram",
    name: "Instagram",
    category: "Social Media",
    description: "Auto-publish images, carousels, and Reels to your Instagram Business account.",
    longDescription:
      "RepurposeAI leverages the Instagram Graph API to publish content directly to Instagram Business accounts. Post single images, carousels, and Reels with captions and location tags. Ideal for batch content creation and scheduling visual content.",
    icon: "Instagram",
    color: "#E4405F",
    status: "beta",
    documentationUrl: "https://developers.facebook.com/docs/instagram-api",
    website: "https://www.instagram.com",
    pricing: "Free",
    apiVersion: "v19.0",
    supportedFeatures: [
      "Image post publishing",
      "Carousel (multi-image) posts",
      "Reel publishing (upcoming)",
      "Caption and hashtag support",
      "Location tagging",
      "Content publishing insights",
    ],
    permissions: [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "pages_read_engagement",
      "business_management",
    ],
    requiredScopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_read_engagement",
    ],
    setupSteps: [
      {
        title: "Convert to Business Account",
        description:
          "Ensure your Instagram account is a Business or Creator account linked to a Facebook Page.",
      },
      {
        title: "Configure Facebook App",
        description:
          "Enable the Instagram Graph API product in your Facebook App and configure the required permissions.",
      },
      {
        title: "Complete App Review",
        description:
          "Submit your app for Instagram Graph API review to obtain instagram_content_publish permission.",
      },
      {
        title: "Connect Business Account",
        description:
          "Authorize RepurposeAI and select the connected Instagram Business account for content publishing.",
      },
    ],
    rateLimits: [
      { limit: "50 posts/day", window: "Per account" },
      { limit: "200 requests/hour", window: "Per user" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "appId", label: "App ID", placeholder: "Facebook App ID", type: "text", required: true },
      { key: "appSecret", label: "App Secret", placeholder: "Facebook App Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "Instagram Graph API token", type: "password", required: true },
      { key: "pageId", label: "Business Account ID", placeholder: "Instagram Business Account ID", type: "text", required: true },
    ],
  },

  tiktok: {
    slug: "tiktok",
    name: "TikTok",
    category: "Video",
    description: "Publish short-form videos directly to TikTok with hashtags and analytics tracking.",
    longDescription:
      "The TikTok integration enables direct video publishing from RepurposeAI to TikTok. Upload pre-rendered videos, add captions and hashtags, and schedule posts for optimal times. Track view counts, likes, shares, and comment metrics.",
    icon: "Music",
    color: "#000000",
    status: "beta",
    documentationUrl: "https://developers.tiktok.com/",
    website: "https://www.tiktok.com",
    pricing: "Free",
    apiVersion: "v2",
    supportedFeatures: [
      "Video publishing",
      "Caption and hashtag support",
      "Scheduled posting",
      "Performance analytics",
      "Comment management",
      "Multiple account support",
    ],
    permissions: [
      "user.info.basic",
      "video.publish",
      "video.upload",
      "data.insights",
    ],
    requiredScopes: [
      "user.info.basic",
      "video.publish",
      "video.upload",
    ],
    setupSteps: [
      {
        title: "Register as TikTok Developer",
        description:
          "Create a developer account at the TikTok for Developers portal and create a new app.",
      },
      {
        title: "Configure OAuth Redirect",
        description:
          "Add RepurposeAI's OAuth callback URL to your TikTok app's redirect URIs.",
      },
      {
        title: "Request Video Upload Permission",
        description:
          "Apply for the video.publish and video.upload permissions in your TikTok app settings.",
      },
      {
        title: "Authorize Account",
        description:
          "Complete the OAuth 2.0 PKCE flow to authorize RepurposeAI to publish videos to your TikTok account.",
      },
    ],
    rateLimits: [
      { limit: "1 video/minute", window: "Per user" },
      { limit: "100 videos/day", window: "Per user" },
      { limit: "1,000 requests/day", window: "Per app" },
    ],
    webhooksSupported: false,
    oauthSupported: true,
    apiKeySupported: true,
    formFields: [
      { key: "clientKey", label: "Client Key", placeholder: "TikTok Client Key", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "TikTok Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "Video publish access token", type: "password", required: false },
      { key: "refreshToken", label: "Refresh Token", placeholder: "Token refresh credential", type: "password", required: false },
    ],
  },

  medium: {
    slug: "medium",
    name: "Medium",
    category: "CMS",
    description: "Export and publish articles with full formatting, images, tags, and publication integration.",
    longDescription:
      "RepurposeAI connects to Medium via their REST API to publish articles with rich formatting, embedded images, and tag support. Publish to your personal profile or a Medium publication with automated formatting conversions from your generated content.",
    icon: "BookOpen",
    color: "#000000",
    status: "connected",
    documentationUrl: "https://github.com/Medium/medium-api-docs",
    website: "https://medium.com",
    pricing: "Free",
    apiVersion: "v1",
    supportedFeatures: [
      "Article publishing",
      "Publication integration",
      "Image embedding",
      "Tag management",
      "Formatting preservation",
      "Draft creation",
    ],
    permissions: [
      "basicProfile",
      "listPublications",
      "publishPost",
      "uploadImage",
    ],
    requiredScopes: [
      "basicProfile",
      "listPublications",
      "publishPost",
    ],
    setupSteps: [
      {
        title: "Get Medium Integration Token",
        description:
          "Go to your Medium Account > Security > Integration Tokens and generate a new token.",
      },
      {
        title: "Copy Your Token",
        description:
          "Copy the generated integration token securely. You will not be able to view it again.",
      },
      {
        title: "Enter Token in RepurposeAI",
        description:
          "Paste the integration token into the RepurposeAI Medium configuration form.",
      },
      {
        title: "Select Publication (Optional)",
        description:
          "Choose whether to publish to your personal profile or a specific Medium publication.",
      },
    ],
    rateLimits: [
      { limit: "5 requests/second", window: "Per user" },
      { limit: "500 requests/day", window: "Per user" },
    ],
    webhooksSupported: false,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Integration Token", placeholder: "Medium Integration Token", type: "password", required: true },
    ],
  },

  ghost: {
    slug: "ghost",
    name: "Ghost",
    category: "CMS",
    description: "Publish content to your Ghost blog with full support for tags, metadata, and members-only posts.",
    longDescription:
      "Integrate RepurposeAI with Ghost's Content and Admin APIs for seamless publishing. Supports standard posts, pages, tags, authors, and member-specific content. Perfect for newsletter-driven content strategies.",
    icon: "Ghost",
    color: "#15171A",
    status: "connected",
    documentationUrl: "https://ghost.org/docs/admin-api/",
    website: "https://ghost.org",
    pricing: "Free",
    apiVersion: "v5 (Admin & Content API)",
    supportedFeatures: [
      "Post and page publishing",
      "Tag management",
      "Author assignment",
      "Member-only content",
      "Metadata and OG tags",
      "Newsletter integration",
    ],
    permissions: [
      "posts:read",
      "posts:write",
      "tags:read",
      "tags:write",
      "authors:read",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Generate Admin API Key",
        description:
          "In your Ghost admin panel, go to Settings > Integrations > Custom Integrations and add a new integration.",
      },
      {
        title: "Copy API Credentials",
        description:
          "Copy the Admin API Key (including the content prefix) and the API URL for your Ghost site.",
      },
      {
        title: "Configure in RepurposeAI",
        description:
          "Enter your Ghost site URL and Admin API Key into the RepurposeAI Ghost configuration form.",
      },
      {
        title: "Test Publishing",
        description:
          "Create a test post in RepurposeAI and publish to Ghost to verify the connection works.",
      },
    ],
    rateLimits: [
      { limit: "60 requests/minute", window: "Per site" },
      { limit: "5,000 requests/day", window: "Per site" },
    ],
    webhooksSupported: true,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Admin API Key", placeholder: "ghost_admin_api_key", type: "password", required: true },
      { key: "siteUrl", label: "Site URL", placeholder: "https://your-blog.ghost.io", type: "url", required: true },
    ],
  },

  hashnode: {
    slug: "hashnode",
    name: "Hashnode",
    category: "CMS",
    description: "Publish articles to your Hashnode blog with rich markdown, tags, and cover images.",
    longDescription:
      "Hashnode's GraphQL API integration allows RepurposeAI to publish articles directly to your Hashnode blog. Supports markdown formatting, tag assignment, cover images, and publication management. Ideal for developer-focused content strategies.",
    icon: "Hash",
    color: "#2962FF",
    status: "connected",
    documentationUrl: "https://apidocs.hashnode.com/",
    website: "https://hashnode.com",
    pricing: "Free",
    apiVersion: "GraphQL",
    supportedFeatures: [
      "Article publishing",
      "Markdown support",
      "Tag management",
      "Cover image uploads",
      "Publication management",
      "Series organization",
    ],
    permissions: [
      "publish_post",
      "publish_series",
      "manage_tags",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Generate Personal Access Token",
        description:
          "Go to your Hashnode account Settings > Developer and create a Personal Access Token with the required scopes.",
      },
      {
        title: "Find Your Publication ID",
        description:
          "Your Hashnode publication ID can be found in your account settings or by checking your blog's URL structure.",
      },
      {
        title: "Configure in RepurposeAI",
        description:
          "Enter your Personal Access Token and Publication ID into the Hashnode configuration form.",
      },
      {
        title: "Publish a Test Article",
        description:
          "Generate and publish a test article from RepurposeAI to verify the integration.",
      },
    ],
    rateLimits: [
      { limit: "100 requests/minute", window: "Per user" },
      { limit: "10,000 requests/day", window: "Per user" },
    ],
    webhooksSupported: false,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Personal Access Token", placeholder: "Hashnode PAT", type: "password", required: true },
      { key: "pageId", label: "Publication ID", placeholder: "Hashnode Publication ID", type: "text", required: true },
    ],
  },

  "dev.to": {
    slug: "dev.to",
    name: "Dev.to",
    category: "CMS",
    description: "Share articles with the developer community with tags, series, and rich markdown formatting.",
    longDescription:
      "Publish articles to the DEV Community platform directly from RepurposeAI. Leverage the Forem API to create posts with tags, series organization, and rich markdown formatting. Ideal for cross-publishing technical content.",
    icon: "Code",
    color: "#0A0A0A",
    status: "connected",
    documentationUrl: "https://developers.forem.com/api",
    website: "https://dev.to",
    pricing: "Free",
    apiVersion: "v1 (Forem API)",
    supportedFeatures: [
      "Article publishing",
      "Series management",
      "Tag support",
      "Markdown formatting",
      "Cover image uploads",
      "Organization posting",
    ],
    permissions: [
      "articles:create",
      "articles:update",
      "articles:publish",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Generate API Key",
        description:
          "Go to your Dev.to account Settings > Extensions and generate a new API key.",
      },
      {
        title: "Copy Your API Key",
        description:
          "Copy the generated API key. This is the only authentication method needed for the Forem API.",
      },
      {
        title: "Enter in RepurposeAI",
        description:
          "Paste your Dev.to API key into the RepurposeAI configuration form for Dev.to.",
      },
      {
        title: "Set Default Tags",
        description:
          "Configure default tags that RepurposeAI should apply to all published Dev.to articles.",
      },
    ],
    rateLimits: [
      { limit: "5 requests/second", window: "Per user" },
      { limit: "500 requests/hour", window: "Per user" },
    ],
    webhooksSupported: false,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "API Key", placeholder: "Dev.to API Key", type: "password", required: true },
    ],
  },

  slack: {
    slug: "slack",
    name: "Slack",
    category: "Communication",
    description: "Send automated messages, share content previews, and receive workflow notifications.",
    longDescription:
      "RepurposeAI's Slack integration enables automated messaging to channels and users. Share content previews, send workflow completion notifications, and trigger automated responses. Ideal for team collaboration and content approval workflows.",
    icon: "MessageSquare",
    color: "#4A154B",
    status: "connected",
    documentationUrl: "https://api.slack.com/docs",
    website: "https://slack.com",
    pricing: "Free",
    apiVersion: "v2 (Web API + Events API)",
    supportedFeatures: [
      "Channel messaging",
      "Direct message support",
      "File uploads and sharing",
      "Block Kit rich messages",
      "Workflow notifications",
      "Command integration",
    ],
    permissions: [
      "channels:read",
      "channels:write",
      "chat:write",
      "files:upload",
      "users:read",
    ],
    requiredScopes: [
      "chat:write",
      "channels:read",
      "channels:join",
    ],
    setupSteps: [
      {
        title: "Create Slack App",
        description:
          "Go to api.slack.com and create a new Slack App with the desired permissions.",
      },
      {
        title: "Configure Bot Token",
        description:
          "Install the app to your workspace and copy the Bot User OAuth Token.",
      },
      {
        title: "Set Scopes",
        description:
          "Add the required bot token scopes including chat:write, channels:read, and channels:join.",
      },
      {
        title: "Test Connection",
        description:
          "Use RepurposeAI's test connection feature to send a test message to your Slack workspace.",
      },
    ],
    rateLimits: [
      { limit: "1 message/second", window: "Per channel" },
      { limit: "100 messages/minute", window: "Per app" },
      { limit: "50 API requests/second", window: "Per app" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Slack App Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Slack App Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Bot Token", placeholder: "xoxb-... bot token", type: "password", required: true },
      { key: "webhookSecret", label: "Signing Secret", placeholder: "Slack Signing Secret", type: "password", required: false },
    ],
  },

  discord: {
    slug: "discord",
    name: "Discord",
    category: "Communication",
    description: "Send rich embed messages, manage threads, and automate notifications in your server.",
    longDescription:
      "Connect RepurposeAI to Discord for automated content delivery and community management. Send rich embed messages with custom colors, fields, and images. Manage threads, assign roles, and notify channels when new content is published.",
    icon: "MessageCircle",
    color: "#5865F2",
    status: "connected",
    documentationUrl: "https://discord.com/developers/docs/intro",
    website: "https://discord.com",
    pricing: "Free",
    apiVersion: "v10 (Discord API)",
    supportedFeatures: [
      "Rich embed messages",
      "Webhook-based posting",
      "Thread management",
      "Role-based notifications",
      "Slash command support (future)",
      "Audit log integration",
    ],
    permissions: [
      "Send Messages",
      "Embed Links",
      "Attach Files",
      "Manage Webhooks",
      "Read Message History",
    ],
    requiredScopes: [
      "bot",
      "webhook.incoming",
      "messages.read",
    ],
    setupSteps: [
      {
        title: "Create Discord Application",
        description:
          "Go to the Discord Developer Portal and create a new application for your bot.",
      },
      {
        title: "Generate Bot Token",
        description:
          "In the Bot section, create a bot user and copy the bot token securely.",
      },
      {
        title: "Invite Bot to Server",
        description:
          "Use the OAuth2 URL Generator to create an invite link with the required permissions and add the bot to your server.",
      },
      {
        title: "Configure Channels",
        description:
          "Select which Discord channels RepurposeAI can post to and configure notification preferences.",
      },
    ],
    rateLimits: [
      { limit: "10 requests/second", window: "Per bot token" },
      { limit: "30 messages/channel/60s", window: "Per channel" },
      { limit: "1,000 requests/5 mins", window: "Per bot token" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Discord Application ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Discord Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Bot Token", placeholder: "Discord Bot Token", type: "password", required: true },
      { key: "webhookSecret", label: "Webhook ID", placeholder: "Discord Webhook ID (optional)", type: "text", required: false },
    ],
  },

  reddit: {
    slug: "reddit",
    name: "Reddit",
    category: "Social Media",
    description: "Submit posts, share content, and engage with communities across subreddits.",
    longDescription:
      "RepurposeAI's Reddit integration enables automated post submissions to subreddits. Submit link posts, text posts, and image posts with proper flair and tagging. Monitor post performance with upvote and comment tracking.",
    icon: "MessageCircle",
    color: "#FF4500",
    status: "beta",
    documentationUrl: "https://www.reddit.com/dev/api/",
    website: "https://www.reddit.com",
    pricing: "Free",
    apiVersion: "v1 (Reddit API)",
    supportedFeatures: [
      "Link post submission",
      "Text (self) post submission",
      "Image post submission",
      "Flair management",
      "Subreddit targeting",
      "Post performance tracking",
    ],
    permissions: [
      "identity",
      "submit",
      "read",
      "history",
      "mysubreddits",
    ],
    requiredScopes: [
      "identity",
      "submit",
      "read",
    ],
    setupSteps: [
      {
        title: "Create Reddit App",
        description:
          "Go to your Reddit account preferences > Apps and create a new 'script' or 'web app' type application.",
      },
      {
        title: "Get Client Credentials",
        description:
          "Copy your Client ID (under the app name) and Client Secret from the app page.",
      },
      {
        title: "Configure OAuth",
        description:
          "Set up OAuth 2.0 with Reddit using the authorization code grant type and RepurposeAI's callback URL.",
      },
      {
        title: "Connect Account",
        description:
          "Authorize RepurposeAI to access your Reddit account and submit posts on your behalf.",
      },
    ],
    rateLimits: [
      { limit: "60 requests/minute", window: "Per user" },
      { limit: "1 post/10 minutes", window: "Per subreddit" },
      { limit: "1,000 requests/hour", window: "Per app" },
    ],
    webhooksSupported: false,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Reddit Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Reddit Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "OAuth access token", type: "password", required: false },
      { key: "refreshToken", label: "Refresh Token", placeholder: "OAuth refresh token", type: "password", required: false },
    ],
  },

  webhook: {
    slug: "webhook",
    name: "Webhook",
    category: "Automation",
    description: "Send custom HTTP requests to any endpoint with configurable headers and payload templates.",
    longDescription:
      "The Webhook integration allows RepurposeAI to send HTTP requests to any external service endpoint. Configure headers, payload templates, authentication, and retry logic. Supports GET, POST, PUT, PATCH, and DELETE methods with custom body formatting.",
    icon: "Webhook",
    color: "#6366F1",
    status: "connected",
    documentationUrl: "https://docs.repurposeai.app/integrations/webhook",
    website: "",
    pricing: "Free",
    apiVersion: "N/A",
    supportedFeatures: [
      "Custom HTTP methods",
      "Header configuration",
      "JSON/XML payload templates",
      "Basic auth & bearer token",
      "Retry with backoff",
      "Webhook response logging",
    ],
    permissions: [
      "outbound_requests",
      "custom_headers",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Get Webhook URL",
        description:
          "Obtain a webhook URL from the service you want to connect. This is typically found in the service's integrations settings.",
      },
      {
        title: "Configure Payload",
        description:
          "Set up the JSON or XML payload template that RepurposeAI will send to your webhook endpoint.",
      },
      {
        title: "Set Authentication",
        description:
          "If required, configure authentication headers like Bearer tokens or Basic Auth credentials.",
      },
      {
        title: "Test the Webhook",
        description:
          "Use RepurposeAI's test webhook feature to verify the connection and inspect the response.",
      },
    ],
    rateLimits: [
      { limit: "60 requests/minute", window: "Per endpoint" },
      { limit: "1,000 requests/hour", window: "Per endpoint" },
    ],
    webhooksSupported: false,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Webhook URL", placeholder: "https://hooks.example.com/endpoint", type: "url", required: true },
      { key: "webhookSecret", label: "Secret", placeholder: "HMAC signing secret (optional)", type: "password", required: false },
      { key: "accessToken", label: "Bearer Token", placeholder: "Bearer token for auth (optional)", type: "password", required: false },
    ],
  },

  zapier: {
    slug: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Trigger Zaps from RepurposeAI and connect to 5,000+ apps via the Zapier ecosystem.",
    longDescription:
      "Connect RepurposeAI to the entire Zapier ecosystem. Trigger Zaps when content is generated, workflows complete, or specific events occur. Send data to 5,000+ apps including CRMs, email marketing platforms, project management tools, and more.",
    icon: "Zap",
    color: "#FF4A00",
    status: "connected",
    documentationUrl: "https://platform.zapier.com/",
    website: "https://zapier.com",
    pricing: "Free (Zapier plan required)",
    apiVersion: "Platform v2",
    supportedFeatures: [
      "Trigger Zaps on events",
      "Send structured data payloads",
      "Custom field mapping",
      "Real-time triggering",
      "Batch processing",
      "Error handling",
    ],
    permissions: [
      "zap_trigger",
      "zap_read",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Create a Zapier Account",
        description:
          "Sign up or log in to your Zapier account and navigate to the Zap creation dashboard.",
      },
      {
        title: "Get Webhook URL",
        description:
          "Create a new Webhooks Zap and copy the unique webhook URL provided by Zapier.",
      },
      {
        title: "Configure RepurposeAI",
        description:
          "Enter the webhook URL into RepurposeAI's Zapier integration settings.",
      },
      {
        title: "Map Data Fields",
        description:
          "Configure which RepurposeAI data fields to send and map them to your Zap actions.",
      },
    ],
    rateLimits: [
      { limit: "10 webhooks/minute", window: "Per account" },
      { limit: "Unlimited data size", window: "Per payload (10MB max)" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Webhook URL", placeholder: "https://hooks.zapier.com/hooks/catch/...", type: "url", required: true },
      { key: "accessToken", label: "API Key", placeholder: "Zapier Platform API Key (optional)", type: "password", required: false },
    ],
  },

  make: {
    slug: "make",
    name: "Make.com",
    category: "Automation",
    description: "Integrate RepurposeAI into Make scenarios for advanced automation workflows.",
    longDescription:
      "Connect RepurposeAI to Make (formerly Integromat) to build sophisticated automation scenarios. Trigger scenarios when content is generated, send data to modules, and process responses. Supports webhook-based triggers and API module integration.",
    icon: "Workflow",
    color: "#1E1E1E",
    status: "connected",
    documentationUrl: "https://www.make.com/en/help",
    website: "https://www.make.com",
    pricing: "Free (Make plan required)",
    apiVersion: "v2",
    supportedFeatures: [
      "Webhook trigger support",
      "Scenario activation",
      "Data transformation",
      "Error handling pipeline",
      "Batch processing",
      "Multi-module workflows",
    ],
    permissions: [
      "webhooks:manage",
      "scenarios:execute",
    ],
    requiredScopes: [],
    setupSteps: [
      {
        title: "Log in to Make",
        description:
          "Sign in to your Make.com account and navigate to the Scenarios dashboard.",
      },
      {
        title: "Create Webhook Module",
        description:
          "Add a Webhook module as the trigger for your scenario and copy the webhook URL.",
      },
      {
        title: "Configure RepurposeAI",
        description:
          "Paste the webhook URL into RepurposeAI's Make.com integration configuration.",
      },
      {
        title: "Set Up Scenario",
        description:
          "Complete your Make scenario by adding modules to process the data sent from RepurposeAI.",
      },
    ],
    rateLimits: [
      { limit: "30 webhooks/minute", window: "Per scenario" },
      { limit: "10MB payload", window: "Per request" },
    ],
    webhooksSupported: true,
    oauthSupported: false,
    apiKeySupported: true,
    formFields: [
      { key: "apiKey", label: "Webhook URL", placeholder: "https://hook.make.com/...", type: "url", required: true },
      { key: "accessToken", label: "API Key", placeholder: "Make API Key (optional)", type: "password", required: false },
      { key: "workspaceId", label: "Team ID", placeholder: "Make Team ID (optional)", type: "text", required: false },
    ],
  },

  "google-drive": {
    slug: "google-drive",
    name: "Google Drive",
    category: "Storage",
    description: "Store generated content, exports, and media files directly in Google Drive folders.",
    longDescription:
      "Save and organize all RepurposeAI-generated content directly to Google Drive. Automatically create files in specific folders, organize by project or date, and share with your team. Supports text documents, images, videos, and audio files.",
    icon: "FolderOpen",
    color: "#4285F4",
    status: "connected",
    documentationUrl: "https://developers.google.com/drive/api/v3/about",
    website: "https://drive.google.com",
    pricing: "Free",
    apiVersion: "v3",
    supportedFeatures: [
      "File creation and upload",
      "Folder organization",
      "File type conversion",
      "Permission management",
      "Search and retrieval",
      "Revision history",
    ],
    permissions: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/drive.appdata",
    ],
    requiredScopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
    setupSteps: [
      {
        title: "Enable Google Drive API",
        description:
          "Go to the Google Cloud Console, enable the Google Drive API for your project.",
      },
      {
        title: "Create OAuth Credentials",
        description:
          "Create OAuth 2.0 Web Application credentials with RepurposeAI's redirect URIs.",
      },
      {
        title: "Configure Scopes",
        description:
          "Ensure the OAuth consent screen includes drive.file and drive.metadata scopes.",
      },
      {
        title: "Authorize Access",
        description:
          "Complete the OAuth flow to grant RepurposeAI access to your Google Drive.",
      },
    ],
    rateLimits: [
      { limit: "1,000 requests/100 sec", window: "Per user" },
      { limit: "10 GB upload/day", window: "Per user" },
      { limit: "10 requests/second", window: "Per user" },
    ],
    webhooksSupported: true,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Google OAuth Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Google OAuth Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "OAuth access token", type: "password", required: false },
      { key: "refreshToken", label: "Refresh Token", placeholder: "OAuth refresh token", type: "password", required: false },
    ],
  },

  gmail: {
    slug: "gmail",
    name: "Gmail",
    category: "Communication",
    description: "Send generated content as emails, create drafts, and manage email campaigns.",
    longDescription:
      "RepurposeAI's Gmail integration enables direct email composition and sending. Create email drafts, send generated content as beautifully formatted emails, and manage email campaigns. Supports HTML formatting, attachments, and recipient list management.",
    icon: "Mail",
    color: "#EA4335",
    status: "connected",
    documentationUrl: "https://developers.google.com/gmail/api",
    website: "https://mail.google.com",
    pricing: "Free",
    apiVersion: "v1",
    supportedFeatures: [
      "Email sending",
      "Draft creation",
      "HTML formatting",
      "Attachment support",
      "Label management",
      "Thread management",
    ],
    permissions: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
    requiredScopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
    setupSteps: [
      {
        title: "Enable Gmail API",
        description:
          "Go to the Google Cloud Console and enable the Gmail API for your project.",
      },
      {
        title: "Configure OAuth Consent",
        description:
          "Set up the OAuth consent screen with gmail.send and gmail.compose scopes.",
      },
      {
        title: "Create Credentials",
        description:
          "Create OAuth 2.0 Web Application credentials with RepurposeAI's callback URIs.",
      },
      {
        title: "Connect Your Email",
        description:
          "Authorize RepurposeAI to send emails from your Gmail account via the OAuth flow.",
      },
    ],
    rateLimits: [
      { limit: "100 messages/day", window: "Per user (free accounts)" },
      { limit: "2,000 messages/day", window: "Per user (Google Workspace)" },
      { limit: "250 requests/user/sec", window: "Per user" },
    ],
    webhooksSupported: false,
    oauthSupported: true,
    apiKeySupported: false,
    formFields: [
      { key: "clientId", label: "Client ID", placeholder: "Google OAuth Client ID", type: "text", required: true },
      { key: "clientSecret", label: "Client Secret", placeholder: "Google OAuth Client Secret", type: "password", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "OAuth access token", type: "password", required: false },
      { key: "refreshToken", label: "Refresh Token", placeholder: "OAuth refresh token", type: "password", required: false },
    ],
  },
};

export function getIntegrationBySlug(slug: string): Integration | undefined {
  return INTEGRATIONS[slug.toLowerCase()];
}

export function getAllIntegrations(): Integration[] {
  return Object.values(INTEGRATIONS);
}

export function getIntegrationsByCategory(category: string): Integration[] {
  return Object.values(INTEGRATIONS).filter(
    (i) => i.category.toLowerCase() === category.toLowerCase()
  );
}

export function getIntegrationCategories(): string[] {
  const categories = new Set(Object.values(INTEGRATIONS).map((i) => i.category));
  return Array.from(categories).sort();
}

export function getIntegrationIcon(slug: string): string {
  const integration = INTEGRATIONS[slug.toLowerCase()];
  return integration?.icon ?? "Puzzle";
}