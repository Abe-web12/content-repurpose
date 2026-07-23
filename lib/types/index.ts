export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tone_profile: Record<string, unknown>;
  plan: "free" | "starter" | "pro";
  generations_used: number;
  generations_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tone: "formal" | "casual" | "witty" | "authoritative" | "friendly";
  example_posts: string[];
  embedding: number[] | null;
  is_default: boolean;
  is_favorite: boolean;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  input_type: "youtube_url" | "blog_url" | "podcast_url" | "raw_text";
  input_content: string;
  extracted_content: string | null;
  output_format: "linkedin_post" | "linkedin_carousel" | "twitter_thread";
  output_content: string;
  voice_profile_id: string | null;
  voice_profile?: VoiceProfile | null;
  tokens_used: number | null;
  model_used: string | null;
  is_favorite: boolean;
  platform: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface BrandKit {
  id: string;
  user_id: string;
  company_name: string;
  company_description: string;
  target_audience: string;
  brand_colors: string[];
  brand_voice: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
}

export type ScheduledPostStatus = "draft" | "scheduled" | "posted";
export type ScheduledPlatform = "linkedin" | "twitter" | "blog" | "other";

export interface ScheduledPost {
  id: string;
  user_id: string;
  content: string;
  platform: ScheduledPlatform;
  scheduled_at: string;
  status: ScheduledPostStatus;
  created_at: string;
  updated_at: string;
}

export type WebhookTriggerEvent =
  | "generation.completed"
  | "schedule.created"
  | "scheduled.posted"
  | "content.published";

export interface UserWebhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  trigger_events: WebhookTriggerEvent[];
  is_active: boolean;
  retry_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  generation_id: string | null;
  action: "generation" | "regeneration";
  credits_consumed: number;
  created_at: string;
}
