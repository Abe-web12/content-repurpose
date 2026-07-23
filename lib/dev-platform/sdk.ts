const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SDKFile {
  path: string;
  content: string;
}

export class SDKGenerator {
  static generate(language: string, apiKey = "YOUR_API_KEY"): SDKFile[] {
    switch (language) {
      case "javascript":
        return this.generateJavaScript(apiKey);
      case "typescript":
        return this.generateTypeScript(apiKey);
      case "python":
        return this.generatePython(apiKey);
      case "go":
        return this.generateGo(apiKey);
      case "php":
        return this.generatePHP(apiKey);
      default:
        return [];
    }
  }

  private static generateJavaScript(apiKey: string): SDKFile[] {
    return [
      {
        path: "index.js",
        content: `const BASE_URL = "${API_BASE_URL}";

class RepurposeAI {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || BASE_URL;
    this.headers = {
      "Authorization": \`Bearer \${this.apiKey}\`,
      "Content-Type": "application/json",
    };
  }

  async request(method, path, body = null) {
    const url = new URL(path, this.baseUrl);
    const response = await fetch(url.toString(), {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || "API request failed");
    }
    return response.json();
  }

  // Generations
  listGenerations(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/generations?\${qs}\`);
  }

  getGeneration(id) {
    return this.request("GET", \`/api/v1/generations/\${id}\`);
  }

  deleteGeneration(id) {
    return this.request("DELETE", \`/api/v1/generations/\${id}\`);
  }

  // Templates
  listTemplates(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/templates?\${qs}\`);
  }

  // Voice Profiles
  listVoiceProfiles(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/voice-profiles?\${qs}\`);
  }

  // Brand Kits
  listBrandKits(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/brand-kits?\${qs}\`);
  }

  // Organization
  getOrganization() {
    return this.request("GET", "/api/v1/organization");
  }

  updateOrganization(data) {
    return this.request("PATCH", "/api/v1/organization", data);
  }

  // Team Members
  listTeamMembers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/team-members?\${qs}\`);
  }

  // Billing
  getBilling() {
    return this.request("GET", "/api/v1/billing");
  }

  listInvoices(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/invoices?\${qs}\`);
  }

  // Credits
  getCredits() {
    return this.request("GET", "/api/v1/credits");
  }

  listCreditTransactions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/credit-transactions?\${qs}\`);
  }

  // Referrals
  getReferralStats() {
    return this.request("GET", "/api/v1/referrals/stats");
  }

  getReferralLeaderboard() {
    return this.request("GET", "/api/v1/referrals/leaderboard");
  }

  // Webhooks
  listWebhookEndpoints() {
    return this.request("GET", "/api/v1/webhooks/endpoints");
  }

  createWebhookEndpoint(data) {
    return this.request("POST", "/api/v1/webhooks/endpoints", data);
  }

  getWebhookEndpoint(id) {
    return this.request("GET", \`/api/v1/webhooks/endpoints/\${id}\`);
  }

  updateWebhookEndpoint(id, data) {
    return this.request("PATCH", \`/api/v1/webhooks/endpoints/\${id}\`, data);
  }

  deleteWebhookEndpoint(id) {
    return this.request("DELETE", \`/api/v1/webhooks/endpoints/\${id}\`);
  }

  listWebhookDeliveries(endpointId, params = {}) {
    const qs = new URLSearchParams({ ...params, endpoint_id: endpointId }).toString();
    return this.request("GET", \`/api/v1/webhooks/deliveries?\${qs}\`);
  }

  retryWebhookDelivery(deliveryId) {
    return this.request("POST", \`/api/v1/webhooks/deliveries/\${deliveryId}/retry\`);
  }

  // Analytics
  getAnalytics(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/analytics/usage?\${qs}\`);
  }

  getRequestLogs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/analytics/requests?\${qs}\`);
  }

  getTopEndpoints() {
    return this.request("GET", "/api/v1/analytics/top-endpoints");
  }

  getRateLimitStats() {
    return this.request("GET", "/api/v1/analytics/rate-limits");
  }

  // Notifications
  listNotifications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request("GET", \`/api/v1/notifications?\${qs}\`);
  }

  markNotificationRead(id) {
    return this.request("PATCH", \`/api/v1/notifications/\${id}/read\`);
  }
}

module.exports = RepurposeAI;`,
      },
      {
        path: "README.md",
        content: `# RepurposeAI JavaScript SDK

## Installation

\`\`\`bash
npm install repurpose-ai
\`\`\`

## Usage

\`\`\`javascript
const RepurposeAI = require("repurpose-ai");

const client = new RepurposeAI("rpai_your_api_key");

// List generations
const generations = await client.listGenerations({ per_page: 20 });

// Get organization details
const org = await client.getOrganization();
\`\`\`

## Documentation

Full API documentation at ${API_BASE_URL}/developers`,
      },
    ];
  }

  private static generateTypeScript(apiKey: string): SDKFile[] {
    const js = this.generateJavaScript(apiKey);
    const jsContent = js[0].content;

    return [
      {
        path: "index.ts",
        content: `const BASE_URL = "${API_BASE_URL}";

interface PaginationParams {
  page?: number;
  per_page?: number;
  cursor?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    page?: number;
    per_page?: number;
    has_more: boolean;
    next_cursor?: string;
  };
}

interface Generation {
  id: string;
  title: string;
  output_format: string;
  platform: string;
  content: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  platform: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  tone: string;
  is_default: boolean;
}

interface BrandKit {
  id: string;
  company_name: string;
  brand_voice: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface BillingInfo {
  plan: string;
  status: string;
  credits: number;
  mrr: number;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

interface Credits {
  balance: number;
  reserved: number;
  available: number;
}

interface CreditTransaction {
  id: string;
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  trigger_events: string[];
  is_active: boolean;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  created_at: string;
}

interface ApiUsage {
  total_requests: number;
  success_count: number;
  error_count: number;
  success_rate: string;
  avg_duration: number;
}

interface RequestLog {
  id: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  created_at: string;
}

class RepurposeAI {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || BASE_URL;
    this.headers = {
      Authorization: \`Bearer \${this.apiKey}\`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const response = await fetch(url.toString(), {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : null,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error((error as any).error || "API request failed");
    }
    return response.json();
  }

  // Generations
  async listGenerations(params?: PaginationParams): Promise<PaginatedResponse<Generation>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/generations?\${qs}\`);
  }

  async getGeneration(id: string): Promise<{ data: Generation }> {
    return this.request(\`/api/v1/generations/\${id}\`);
  }

  async deleteGeneration(id: string): Promise<{ data: { success: boolean } }> {
    return this.request("DELETE", \`/api/v1/generations/\${id}\`);
  }

  // Templates
  async listTemplates(params?: PaginationParams): Promise<PaginatedResponse<Template>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/templates?\${qs}\`);
  }

  // Voice Profiles
  async listVoiceProfiles(params?: PaginationParams): Promise<PaginatedResponse<VoiceProfile>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/voice-profiles?\${qs}\`);
  }

  // Brand Kits
  async listBrandKits(params?: PaginationParams): Promise<PaginatedResponse<BrandKit>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/brand-kits?\${qs}\`);
  }

  // Organization
  async getOrganization(): Promise<{ data: Organization }> {
    return this.request("/api/v1/organization");
  }

  async updateOrganization(data: Partial<Organization>): Promise<{ data: Organization }> {
    return this.request("PATCH", "/api/v1/organization", data);
  }

  // Team Members
  async listTeamMembers(params?: PaginationParams): Promise<PaginatedResponse<TeamMember>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/team-members?\${qs}\`);
  }

  // Billing
  async getBilling(): Promise<{ data: BillingInfo }> {
    return this.request("/api/v1/billing");
  }

  async listInvoices(params?: PaginationParams): Promise<PaginatedResponse<Invoice>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/invoices?\${qs}\`);
  }

  // Credits
  async getCredits(): Promise<{ data: Credits }> {
    return this.request("/api/v1/credits");
  }

  async listCreditTransactions(params?: PaginationParams): Promise<PaginatedResponse<CreditTransaction>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/credit-transactions?\${qs}\`);
  }

  // Referrals
  async getReferralStats(): Promise<any> {
    return this.request("/api/v1/referrals/stats");
  }

  // Webhooks
  async listWebhookEndpoints(): Promise<PaginatedResponse<WebhookEndpoint>> {
    return this.request("/api/v1/webhooks/endpoints");
  }

  async createWebhookEndpoint(data: Partial<WebhookEndpoint>): Promise<{ data: WebhookEndpoint }> {
    return this.request("POST", "/api/v1/webhooks/endpoints", data);
  }

  async getWebhookEndpoint(id: string): Promise<{ data: WebhookEndpoint }> {
    return this.request(\`/api/v1/webhooks/endpoints/\${id}\`);
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    return this.request("DELETE", \`/api/v1/webhooks/endpoints/\${id}\`);
  }

  async listWebhookDeliveries(endpointId: string, params?: PaginationParams): Promise<PaginatedResponse<WebhookDelivery>> {
    const qs = new URLSearchParams({ ...params, endpoint_id: endpointId } as any).toString();
    return this.request(\`/api/v1/webhooks/deliveries?\${qs}\`);
  }

  async retryWebhookDelivery(deliveryId: string): Promise<{ data: WebhookDelivery }> {
    return this.request("POST", \`/api/v1/webhooks/deliveries/\${deliveryId}/retry\`);
  }

  // Analytics
  async getUsageStats(): Promise<{ data: ApiUsage }> {
    return this.request("/api/v1/analytics/usage");
  }

  async getRequestLogs(params?: PaginationParams): Promise<PaginatedResponse<RequestLog>> {
    const qs = new URLSearchParams(params as any).toString();
    return this.request(\`/api/v1/analytics/requests?\${qs}\`);
  }
}

export default RepurposeAI;`,
      },
      { path: "README.md", content: `# RepurposeAI TypeScript SDK

## Installation

\`\`\`bash
npm install repurpose-ai
\`\`\`

## Usage

\`\`\`typescript
import RepurposeAI from "repurpose-ai";

const client = new RepurposeAI("rpai_your_api_key");

const { data: generations } = await client.listGenerations({ per_page: 20 });
\`\`\`

## Documentation

Full API documentation at ${API_BASE_URL}/developers`,
      },
    ];
  }

  private static generatePython(apiKey: string): SDKFile[] {
    return [
      {
        path: "repurpose_ai/__init__.py",
        content: `from .client import RepurposeAI

__all__ = ["RepurposeAI"]`,
      },
      {
        path: "repurpose_ai/client.py",
        content: `import requests
from typing import Optional, Dict, Any


class RepurposeAI:
    BASE_URL = "${API_BASE_URL}"

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.api_key = api_key
        self.base_url = base_url or self.BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, body: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{path}"
        response = requests.request(method, url, headers=self.headers, json=body)
        if not response.ok:
            error = response.json().get("error", response.reason)
            raise Exception(error)
        return response.json()

    def list_generations(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/generations?{qs}")

    def get_generation(self, id: str) -> Dict:
        return self._request("GET", f"/api/v1/generations/{id}")

    def delete_generation(self, id: str) -> Dict:
        return self._request("DELETE", f"/api/v1/generations/{id}")

    def list_templates(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/templates?{qs}")

    def list_voice_profiles(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/voice-profiles?{qs}")

    def list_brand_kits(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/brand-kits?{qs}")

    def get_organization(self) -> Dict:
        return self._request("GET", "/api/v1/organization")

    def update_organization(self, **kwargs) -> Dict:
        return self._request("PATCH", "/api/v1/organization", kwargs)

    def list_team_members(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/team-members?{qs}")

    def get_billing(self) -> Dict:
        return self._request("GET", "/api/v1/billing")

    def list_invoices(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/invoices?{qs}")

    def get_credits(self) -> Dict:
        return self._request("GET", "/api/v1/credits")

    def list_credit_transactions(self, page: int = 1, per_page: int = 20, **kwargs) -> Dict:
        params = {"page": page, "per_page": per_page, **kwargs}
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        return self._request("GET", f"/api/v1/credit-transactions?{qs}")

    def list_webhook_endpoints(self) -> Dict:
        return self._request("GET", "/api/v1/webhooks/endpoints")

    def create_webhook_endpoint(self, name: str, url: str, trigger_events: list, **kwargs) -> Dict:
        return self._request("POST", "/api/v1/webhooks/endpoints", {
            "name": name, "url": url, "trigger_events": trigger_events, **kwargs
        })

    def get_webhook_endpoint(self, id: str) -> Dict:
        return self._request("GET", f"/api/v1/webhooks/endpoints/{id}")

    def delete_webhook_endpoint(self, id: str) -> Dict:
        return self._request("DELETE", f"/api/v1/webhooks/endpoints/{id}")

    def list_webhook_deliveries(self, endpoint_id: str, page: int = 1, per_page: int = 20) -> Dict:
        return self._request("GET", f"/api/v1/webhooks/deliveries?endpoint_id={endpoint_id}&page={page}&per_page={per_page}")

    def retry_webhook_delivery(self, delivery_id: str) -> Dict:
        return self._request("POST", f"/api/v1/webhooks/deliveries/{delivery_id}/retry")

    def get_usage_stats(self) -> Dict:
        return self._request("GET", "/api/v1/analytics/usage")

    def get_request_logs(self, page: int = 1, per_page: int = 20) -> Dict:
        return self._request("GET", f"/api/v1/analytics/requests?page={page}&per_page={per_page}")`,
      },
      {
        path: "setup.py",
        content: `from setuptools import setup, find_packages

setup(
    name="repurpose-ai",
    version="0.1.0",
    packages=find_packages(),
    install_requires=["requests>=2.25.0"],
    description="RepurposeAI API Client",
    author="RepurposeAI",
)`,
      },
    ];
  }

  private static generateGo(apiKey: string): SDKFile[] {
    return [
      {
        path: "repurposeai/client.go",
        content: `package repurposeai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const defaultBaseURL = "${API_BASE_URL}"

type Client struct {
	apiKey  string
	baseURL string
	http    *http.Client
}

type PaginatedResponse struct {
	Data       interface{} \`json:"data"\`
	Pagination struct {
		Total    int    \`json:"total,omitempty"\`
		Page     int    \`json:"page,omitempty"\`
		PerPage  int    \`json:"per_page,omitempty"\`
		HasMore  bool   \`json:"has_more"\`
		NextCursor string \`json:"next_cursor,omitempty"\`
	} \`json:"pagination"\`
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:  apiKey,
		baseURL: defaultBaseURL,
		http:    &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) doRequest(method, path string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		var errResp struct {
			Error string \`json:"error"\`
		}
		json.Unmarshal(respBody, &errResp)
		return nil, fmt.Errorf(errResp.Error)
	}

	return respBody, nil
}

func (c *Client) ListGenerations(page, perPage int) (*PaginatedResponse, error) {
	path := fmt.Sprintf("/api/v1/generations?page=%d&per_page=%d", page, perPage)
	body, err := c.doRequest("GET", path, nil)
	if err != nil {
		return nil, err
	}
	var result PaginatedResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) GetGeneration(id string) ([]byte, error) {
	return c.doRequest("GET", fmt.Sprintf("/api/v1/generations/%s", id), nil)
}

func (c *Client) GetOrganization() ([]byte, error) {
	return c.doRequest("GET", "/api/v1/organization", nil)
}

func (c *Client) GetBilling() ([]byte, error) {
	return c.doRequest("GET", "/api/v1/billing", nil)
}

func (c *Client) GetCredits() ([]byte, error) {
	return c.doRequest("GET", "/api/v1/credits", nil)
}

func (c *Client) ListWebhookEndpoints() ([]byte, error) {
	return c.doRequest("GET", "/api/v1/webhooks/endpoints", nil)
}

func (c *Client) CreateWebhookEndpoint(name, webhookURL string, triggerEvents []string) ([]byte, error) {
	body := map[string]interface{}{
		"name":           name,
		"url":            webhookURL,
		"trigger_events": triggerEvents,
	}
	return c.doRequest("POST", "/api/v1/webhooks/endpoints", body)
}

func (c *Client) GetUsageStats() ([]byte, error) {
	return c.doRequest("GET", "/api/v1/analytics/usage", nil)
}`,
      },
      {
        path: "go.mod",
        content: `module github.com/repurpose-ai/repurposeai-go

go 1.21`,
      },
    ];
  }

  private static generatePHP(apiKey: string): SDKFile[] {
    return [
      {
        path: "src/RepurposeAI.php",
        content: `<?php

namespace RepurposeAI;

class RepurposeAI
{
    private string $apiKey;
    private string $baseUrl;
    private array $headers;

    public function __construct(string $apiKey, ?string $baseUrl = null)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl ?? "${API_BASE_URL}";
        $this->headers = [
            "Authorization: Bearer " . $apiKey,
            "Content-Type: application/json",
        ];
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = $this->baseUrl . $path;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            $error = json_decode($response, true);
            throw new \Exception($error["error"] ?? "API request failed");
        }

        return json_decode($response, true);
    }

    public function listGenerations(int $page = 1, int $perPage = 20): array
    {
        return $this->request("GET", "/api/v1/generations?page={$page}&per_page={$perPage}");
    }

    public function getGeneration(string $id): array
    {
        return $this->request("GET", "/api/v1/generations/{$id}");
    }

    public function getOrganization(): array
    {
        return $this->request("GET", "/api/v1/organization");
    }

    public function getBilling(): array
    {
        return $this->request("GET", "/api/v1/billing");
    }

    public function getCredits(): array
    {
        return $this->request("GET", "/api/v1/credits");
    }

    public function listWebhookEndpoints(): array
    {
        return $this->request("GET", "/api/v1/webhooks/endpoints");
    }

    public function createWebhookEndpoint(string $name, string $url, array $triggerEvents): array
    {
        return $this->request("POST", "/api/v1/webhooks/endpoints", [
            "name" => $name,
            "url" => $url,
            "trigger_events" => $triggerEvents,
        ]);
    }

    public function getUsageStats(): array
    {
        return $this->request("GET", "/api/v1/analytics/usage");
    }
}`,
      },
      {
        path: "composer.json",
        content: `{
    "name": "repurpose-ai/repurpose-ai-php",
    "description": "RepurposeAI API Client",
    "type": "library",
    "autoload": {
        "psr-4": {
            "RepurposeAI\\\\": "src/"
        }
    },
    "require": {
        "php": ">=8.0",
        "ext-curl": "*"
    },
    "minimum-stability": "stable"
}`,
      },
    ];
  }

  static getPackageManagers(): Record<string, string> {
    return {
      javascript: "npm install repurpose-ai",
      typescript: "npm install repurpose-ai",
      python: "pip install repurpose-ai",
      go: "go get github.com/repurpose-ai/repurposeai-go",
      php: "composer require repurpose-ai/repurpose-ai-php",
    };
  }
}
