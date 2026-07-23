import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "email",
  name: "Email (Gmail)",
  version: "1.0.0",
  icon: "mail",
  description: "Send and receive emails via Gmail with full message threading support",
  category: "Communication",
  type: "COMMUNICATION",
  permissions: ["read:messages", "write:messages", "read:labels", "read:threads", "write:send"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "GOOGLE_DRIVE",
  rateLimit: { requestsPerSecond: 10, maxRetries: 3, baseDelayMs: 500 },
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

interface GmailThread {
  id: string;
  messageCount: number;
  lastMessageDate: string;
  subject: string;
  snippet: string;
}

interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string;
    mimeType: string;
  }>;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
}

export class EmailIntegration extends BaseIntegration {
  private apiBase = "https://gmail.googleapis.com/gmail/v1/users/me";

  constructor() {
    super(CONFIG);
  }

  async healthCheck(
    installedId: string,
    _config: Record<string, unknown>
  ): Promise<HealthCheckResult> {
    try {
      const start = Date.now();
      const token = await this.getValidToken(installedId);
      await this.apiRequest<{ messagesTotal: number }>(
        `${this.apiBase}/profile`,
        { token }
      );
      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Gmail API is accessible",
      };
    } catch (err) {
      return {
        healthy: false,
        message: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  protected async performSync(
    installedId: string,
    _organizationId: string,
    config: Record<string, unknown>
  ): Promise<SyncResult> {
    const token = await this.getValidToken(installedId);
    const maxResults = Number(config.maxResults ?? 50);

    const messages = await this.apiRequest<{
      messages?: Array<{ id: string; threadId: string }>;
      resultSizeEstimate: number;
    }>(
      `${this.apiBase}/messages?maxResults=${maxResults}&q=${encodeURIComponent("in:inbox")}`,
      { token }
    );

    return {
      success: true,
      recordsProcessed: messages.messages?.length ?? 0,
      metadata: {
        totalMessages: messages.resultSizeEstimate,
      },
    };
  }

  async action_sendEmail(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const email = params as Record<string, unknown> & SendEmailParams;

    const to = Array.isArray(email.to) ? email.to.join(", ") : email.to;
    const cc = email.cc ? (Array.isArray(email.cc) ? email.cc.join(", ") : email.cc) : "";
    const bcc = email.bcc ? (Array.isArray(email.bcc) ? email.bcc.join(", ") : email.bcc) : "";

    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const lines: string[] = [
      `To: ${to}`,
      `Subject: ${email.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
    ];

    if (email.isHtml) {
      lines.push(
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(email.body).toString("base64"),
        ""
      );
    } else {
      lines.push(
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(email.body).toString("base64"),
        ""
      );
    }

    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        lines.push(
          `--${boundary}`,
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
          "Content-Transfer-Encoding: base64",
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          "",
          attachment.content,
          ""
        );
      }
    }

    lines.push(`--${boundary}--`);

    if (cc) lines.splice(1, 0, `Cc: ${cc}`);
    if (bcc) lines.splice(cc ? 2 : 1, 0, `Bcc: ${bcc}`);

    const rawEmail = lines.join("\r\n");
    const encodedEmail = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return this.apiRequest(`${this.apiBase}/messages/send`, {
      method: "POST",
      token,
      body: { raw: encodedEmail },
    });
  }

  async action_listMessages(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const maxResults = Number(params.maxResults ?? 50);
    const query = String(params.query ?? "");

    const listData = await this.apiRequest<{
      messages?: Array<{ id: string; threadId: string }>;
    }>(
      `${this.apiBase}/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      { token }
    );

    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    const messages: GmailMessage[] = [];
    for (const msg of listData.messages.slice(0, 10)) {
      const detail = await this.getMessageDetail(token, msg.id);
      messages.push(detail);
    }

    return messages;
  }

  async action_getMessage(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const messageId = String(params.messageId ?? "");
    return this.getMessageDetail(token, messageId);
  }

  async action_listThreads(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const maxResults = Number(params.maxResults ?? 50);

    const data = await this.apiRequest<{
      threads?: Array<{ id: string; snippet: string }>;
    }>(
      `${this.apiBase}/threads?maxResults=${maxResults}`,
      { token }
    );

    if (!data.threads) return [];

    const threads: GmailThread[] = [];
    for (const t of data.threads.slice(0, 10)) {
      const detail = await this.apiRequest<{
        id: string;
        messageCount: number;
        messages: Array<{
          internalDate: string;
          payload: {
            headers: Array<{ name: string; value: string }>;
          };
        }>;
      }>(`${this.apiBase}/threads/${t.id}`, { token });

      const headers = detail.messages[0]?.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const lastDate = detail.messages[detail.messages.length - 1]?.internalDate;
      const snippet = t.snippet;

      threads.push({
        id: detail.id,
        messageCount: detail.messageCount,
        lastMessageDate: lastDate ? new Date(Number(lastDate)).toISOString() : "",
        subject,
        snippet,
      });
    }

    return threads;
  }

  async action_trashMessage(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const messageId = String(params.messageId ?? "");

    await this.apiRequest(`${this.apiBase}/messages/${messageId}/trash`, {
      method: "POST",
      token,
    });

    return { success: true, messageId };
  }

  async action_modifyLabels(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const messageId = String(params.messageId ?? "");
    const addLabels = (params.addLabels as string[]) ?? [];
    const removeLabels = (params.removeLabels as string[]) ?? [];

    return this.apiRequest(`${this.apiBase}/messages/${messageId}/modify`, {
      method: "POST",
      token,
      body: {
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      },
    });
  }

  private async getMessageDetail(
    token: string,
    messageId: string
  ): Promise<GmailMessage> {
    const data = await this.apiRequest<{
      id: string;
      threadId: string;
      labelIds: string[];
      snippet: string;
      payload: {
        headers: Array<{ name: string; value: string }>;
        parts?: Array<{
          mimeType: string;
          body: { data?: string; size: number };
          filename: string;
          partId: string;
        }>;
        body: { data?: string; size: number };
        mimeType: string;
        filename: string;
      };
      internalDate: string;
    }>(`${this.apiBase}/messages/${messageId}?format=full`, { token });

    const headers = data.payload.headers;
    const getHeader = (name: string): string =>
      headers.find((h) => h.name === name)?.value ?? "";

    const decodeBase64 = (data: string | undefined): string => {
      if (!data) return "";
      try {
        return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
      } catch {
        return "";
      }
    };

    let body = "";
    const attachments: GmailMessage["attachments"] = [];

    if (data.payload.body?.data) {
      body = decodeBase64(data.payload.body.data);
    } else if (data.payload.parts) {
      for (const part of data.payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          body = decodeBase64(part.body.data);
        } else if (part.filename && part.filename.length > 0) {
          attachments.push({
            id: part.partId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
          });
        }
      }
    }

    return {
      id: data.id,
      threadId: data.threadId,
      labelIds: data.labelIds,
      snippet: data.snippet,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      date: new Date(Number(data.internalDate)).toISOString(),
      body,
      attachments,
    };
  }
}

export const email = new EmailIntegration();
