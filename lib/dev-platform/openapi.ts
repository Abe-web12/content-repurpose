const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export class OpenAPISpec {
  static generate(): Record<string, unknown> {
    return {
      openapi: "3.1.0",
      info: {
        title: "RepurposeAI API",
        description: "REST API for the RepurposeAI content repurposing platform. Generate, manage, and publish content across multiple platforms.",
        version: "1.0.0",
        contact: {
          name: "RepurposeAI Support",
          email: "support@repurposeai.com",
          url: `${API_BASE_URL}/support`,
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        { url: API_BASE_URL, description: "Production" },
        { url: "http://localhost:3000", description: "Development" },
      ],
      security: [
        { BearerAuth: [] },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "API key",
            description: "API keys prefixed with `rpai_`. Generate from the Developer Dashboard.",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Error message" },
            },
          },
          Pagination: {
            type: "object",
            properties: {
              page: { type: "integer", description: "Current page number" },
              per_page: { type: "integer", description: "Items per page" },
              total: { type: "integer", description: "Total items" },
              has_more: { type: "boolean", description: "Whether more pages exist" },
              next_cursor: { type: "string", description: "Cursor for next page" },
            },
          },
          Generation: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              source_url: { type: "string", nullable: true },
              content: { type: "string" },
              input_type: { type: "string" },
              output_format: { type: "string" },
              platform: { type: "string", enum: ["LINKEDIN", "TWITTER"] },
              model_used: { type: "string" },
              tokens_used: { type: "integer" },
              is_favorite: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          Template: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              platform: { type: "string" },
              content: { type: "string" },
              is_custom: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          VoiceProfile: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              tone: { type: "string", enum: ["FORMAL", "CASUAL", "WITTY", "AUTHORITATIVE", "FRIENDLY"] },
              is_default: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          BrandKit: {
            type: "object",
            properties: {
              id: { type: "string" },
              company_name: { type: "string" },
              company_description: { type: "string" },
              target_audience: { type: "string" },
              brand_voice: { type: "string" },
              brand_colors: { type: "array", items: { type: "string" } },
              logo_url: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          Organization: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              slug: { type: "string" },
              plan: { type: "string" },
              max_seats: { type: "integer" },
              timezone: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          TeamMember: {
            type: "object",
            properties: {
              id: { type: "string" },
              user_id: { type: "string" },
              role: { type: "string", enum: ["OWNER", "ADMIN", "MANAGER", "EDITOR", "VIEWER"] },
              joined_at: { type: "string", format: "date-time" },
            },
          },
          Billing: {
            type: "object",
            properties: {
              plan: { type: "string" },
              status: { type: "string" },
              credits: { type: "object", properties: { balance: { type: "integer" }, available: { type: "integer" } } },
              mrr: { type: "number" },
              subscription: { type: "object" },
            },
          },
          Invoice: {
            type: "object",
            properties: {
              id: { type: "string" },
              amount: { type: "integer" },
              currency: { type: "string" },
              status: { type: "string" },
              hosted_invoice_url: { type: "string", nullable: true },
              paid_at: { type: "string", format: "date-time", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          Credits: {
            type: "object",
            properties: {
              balance: { type: "integer" },
              reserved: { type: "integer" },
              available: { type: "integer" },
              total_purchased: { type: "integer" },
              total_spent: { type: "integer" },
            },
          },
          CreditTransaction: {
            type: "object",
            properties: {
              id: { type: "string" },
              amount: { type: "integer" },
              source: { type: "string" },
              description: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          WebhookEndpoint: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              url: { type: "string", format: "uri" },
              trigger_events: { type: "array", items: { type: "string" } },
              is_active: { type: "boolean" },
              description: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          WebhookDelivery: {
            type: "object",
            properties: {
              id: { type: "string" },
              event_type: { type: "string" },
              status: { type: "string", enum: ["pending", "delivering", "delivered", "retrying", "failed"] },
              response_status: { type: "integer", nullable: true },
              attempt_number: { type: "integer" },
              error: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
          ApiUsage: {
            type: "object",
            properties: {
              total_requests: { type: "integer" },
              success_count: { type: "integer" },
              error_count: { type: "integer" },
              success_rate: { type: "string" },
              avg_duration: { type: "integer" },
              top_paths: { type: "array", items: { type: "object", properties: { path: { type: "string" }, count: { type: "integer" }, avg_duration: { type: "integer" } } } },
            },
          },
          RequestLog: {
            type: "object",
            properties: {
              id: { type: "string" },
              method: { type: "string" },
              path: { type: "string" },
              status: { type: "integer" },
              duration: { type: "integer" },
              ip_address: { type: "string", nullable: true },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
      paths: {
        "/api/v1/generations": {
          get: {
            tags: ["Generations"],
            summary: "List all generations",
            description: "Returns a paginated list of content generations for the authenticated organization.",
            security: [{ BearerAuth: [] }],
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
              { name: "cursor", in: "query", schema: { type: "string" }, description: "Cursor for cursor-based pagination" },
              { name: "sort", in: "query", schema: { type: "string", enum: ["created_at", "updated_at", "title"] }, description: "Sort field" },
              { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] }, description: "Sort order" },
              { name: "platform", in: "query", schema: { type: "string", enum: ["LINKEDIN", "TWITTER"] } },
              { name: "search", in: "query", schema: { type: "string" }, description: "Search in title and content" },
              { name: "start_date", in: "query", schema: { type: "string", format: "date" } },
              { name: "end_date", in: "query", schema: { type: "string", format: "date" } },
              { name: "Idempotency-Key", in: "header", schema: { type: "string" }, description: "Idempotency key for safe retries" },
            ],
            responses: {
              "200": { description: "Paginated list of generations", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Generation" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } } },
              "401": { description: "Unauthorized" },
              "429": { description: "Rate limit exceeded" },
            },
          },
          post: {
            tags: ["Generations"],
            summary: "Create a generation",
            description: "Generate content from source material.",
            security: [{ BearerAuth: [] }],
            parameters: [
              { name: "Idempotency-Key", in: "header", schema: { type: "string" }, description: "Idempotency key for safe retries" },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["content", "output_format"],
                    properties: {
                      content: { type: "string", description: "Source content to repurpose" },
                      output_format: { type: "string", description: "Target format" },
                      platform: { type: "string", enum: ["LINKEDIN", "TWITTER"] },
                      voice_profile_id: { type: "string" },
                      brand_kit_id: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: {
              "201": { description: "Generation created" },
              "400": { description: "Invalid input" },
              "401": { description: "Unauthorized" },
              "429": { description: "Rate limit exceeded" },
            },
          },
        },
        "/api/v1/generations/{id}": {
          get: {
            tags: ["Generations"],
            summary: "Get a generation by ID",
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              "200": { description: "Generation details" },
              "404": { description: "Not found" },
            },
          },
          delete: {
            tags: ["Generations"],
            summary: "Delete a generation",
            parameters: [
              { name: "id", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: {
              "200": { description: "Generation deleted" },
              "404": { description: "Not found" },
            },
          },
        },
        "/api/v1/templates": {
          get: {
            tags: ["Templates"],
            summary: "List templates",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
              { name: "category", in: "query", schema: { type: "string" } },
              { name: "platform", in: "query", schema: { type: "string", enum: ["LINKEDIN", "TWITTER"] } },
            ],
            responses: {
              "200": { description: "Paginated list of templates", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Template" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } } },
            },
          },
        },
        "/api/v1/voice-profiles": {
          get: {
            tags: ["Voice Profiles"],
            summary: "List voice profiles",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
            ],
            responses: {
              "200": { description: "Paginated list of voice profiles" },
            },
          },
        },
        "/api/v1/brand-kits": {
          get: {
            tags: ["Brand Kits"],
            summary: "List brand kits",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
            ],
            responses: {
              "200": { description: "Paginated list of brand kits" },
            },
          },
        },
        "/api/v1/organization": {
          get: {
            tags: ["Organization"],
            summary: "Get organization details",
            responses: { "200": { description: "Organization details" } },
          },
          patch: {
            tags: ["Organization"],
            summary: "Update organization",
            requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, timezone: { type: "string" } } } } } },
            responses: { "200": { description: "Organization updated" } },
          },
        },
        "/api/v1/team-members": {
          get: {
            tags: ["Team"],
            summary: "List team members",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
              { name: "role", in: "query", schema: { type: "string" } },
            ],
            responses: { "200": { description: "Paginated list of team members" } },
          },
        },
        "/api/v1/billing": {
          get: {
            tags: ["Billing"],
            summary: "Get billing information",
            responses: { "200": { description: "Billing details" } },
          },
        },
        "/api/v1/invoices": {
          get: {
            tags: ["Billing"],
            summary: "List invoices",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
              { name: "status", in: "query", schema: { type: "string" } },
            ],
            responses: { "200": { description: "Paginated list of invoices" } },
          },
        },
        "/api/v1/credits": {
          get: {
            tags: ["Credits"],
            summary: "Get credit balance",
            responses: { "200": { description: "Credit balance details" } },
          },
        },
        "/api/v1/credit-transactions": {
          get: {
            tags: ["Credits"],
            summary: "List credit transactions",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
              { name: "source", in: "query", schema: { type: "string" } },
            ],
            responses: { "200": { description: "Paginated list of credit transactions" } },
          },
        },
        "/api/v1/referrals/stats": {
          get: {
            tags: ["Referrals"],
            summary: "Get referral statistics",
            responses: { "200": { description: "Referral stats" } },
          },
        },
        "/api/v1/referrals/leaderboard": {
          get: {
            tags: ["Referrals"],
            summary: "Get referral leaderboard",
            responses: { "200": { description: "Referral leaderboard" } },
          },
        },
        "/api/v1/webhooks/endpoints": {
          get: {
            tags: ["Webhooks"],
            summary: "List webhook endpoints",
            responses: { "200": { description: "List of webhook endpoints", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/WebhookEndpoint" } } } } } } } },
          },
          post: {
            tags: ["Webhooks"],
            summary: "Create webhook endpoint",
            requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "url", "trigger_events"], properties: { name: { type: "string" }, url: { type: "string", format: "uri" }, trigger_events: { type: "array", items: { type: "string" } }, description: { type: "string" }, retry_count: { type: "integer", default: 3 }, timeout: { type: "integer", default: 10 } } } } } },
            responses: { "201": { description: "Webhook endpoint created" } },
          },
        },
        "/api/v1/webhooks/endpoints/{id}": {
          get: {
            tags: ["Webhooks"],
            summary: "Get webhook endpoint",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Webhook endpoint details" } },
          },
          patch: {
            tags: ["Webhooks"],
            summary: "Update webhook endpoint",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Webhook endpoint updated" } },
          },
          delete: {
            tags: ["Webhooks"],
            summary: "Delete webhook endpoint",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Webhook endpoint deleted" } },
          },
        },
        "/api/v1/webhooks/endpoints/{id}/secret": {
          post: {
            tags: ["Webhooks"],
            summary: "Rotate webhook secret",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Secret rotated" } },
          },
        },
        "/api/v1/webhooks/deliveries": {
          get: {
            tags: ["Webhooks"],
            summary: "List webhook deliveries",
            parameters: [
              { name: "endpoint_id", in: "query", schema: { type: "string" } },
              { name: "status", in: "query", schema: { type: "string" } },
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
            ],
            responses: { "200": { description: "Paginated list of deliveries" } },
          },
        },
        "/api/v1/webhooks/deliveries/{id}/retry": {
          post: {
            tags: ["Webhooks"],
            summary: "Retry webhook delivery",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Delivery retried" } },
          },
        },
        "/api/v1/analytics/usage": {
          get: {
            tags: ["Analytics"],
            summary: "Get API usage statistics",
            parameters: [{ name: "days", in: "query", schema: { type: "integer", default: 30 } }],
            responses: { "200": { description: "Usage statistics", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiUsage" } } } } },
          },
        },
        "/api/v1/analytics/requests": {
          get: {
            tags: ["Analytics"],
            summary: "Get request logs",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 50 } },
              { name: "path", in: "query", schema: { type: "string" } },
              { name: "status", in: "query", schema: { type: "integer" } },
            ],
            responses: { "200": { description: "Paginated request logs" } },
          },
        },
        "/api/v1/analytics/top-endpoints": {
          get: {
            tags: ["Analytics"],
            summary: "Get top endpoints by request volume",
            responses: { "200": { description: "Top endpoints" } },
          },
        },
        "/api/v1/analytics/rate-limits": {
          get: {
            tags: ["Analytics"],
            summary: "Get rate limit statistics",
            responses: { "200": { description: "Rate limit stats" } },
          },
        },
        "/api/v1/notifications": {
          get: {
            tags: ["Notifications"],
            summary: "List notifications",
            parameters: [
              { name: "page", in: "query", schema: { type: "integer", default: 1 } },
              { name: "per_page", in: "query", schema: { type: "integer", default: 20 } },
            ],
            responses: { "200": { description: "Paginated list of notifications" } },
          },
        },
        "/api/v1/notifications/{id}/read": {
          patch: {
            tags: ["Notifications"],
            summary: "Mark notification as read",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Notification marked as read" } },
          },
        },
      },
      tags: [
        { name: "Generations", description: "Content generation operations" },
        { name: "Templates", description: "Content templates" },
        { name: "Voice Profiles", description: "Voice and tone profiles" },
        { name: "Brand Kits", description: "Brand identity kits" },
        { name: "Organization", description: "Organization management" },
        { name: "Team", description: "Team member management" },
        { name: "Billing", description: "Billing and subscription" },
        { name: "Credits", description: "Credit management" },
        { name: "Referrals", description: "Referral program" },
        { name: "Webhooks", description: "Webhook endpoint management" },
        { name: "Analytics", description: "API usage analytics" },
        { name: "Notifications", description: "Notification management" },
      ],
    };
  }
}
