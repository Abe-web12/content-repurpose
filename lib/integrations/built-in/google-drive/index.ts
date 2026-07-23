import {
  BaseIntegration,
  BaseIntegrationConfig,
} from "../_base";
import {
  SyncResult,
  HealthCheckResult,
} from "../../types";

const CONFIG: BaseIntegrationConfig = {
  id: "google-drive",
  name: "Google Drive",
  version: "1.0.0",
  icon: "hard-drive",
  description: "Access, create, and manage files and folders in Google Drive",
  category: "Storage",
  type: "STORAGE",
  permissions: ["read:files", "write:files", "read:metadata", "write:metadata"],
  hasOAuth: true,
  hasWebhooks: true,
  oauthProvider: "GOOGLE_DRIVE",
  rateLimit: { requestsPerSecond: 10, maxRetries: 3, baseDelayMs: 500 },
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  parents: string[];
  webViewLink: string;
  iconLink: string;
  fileExtension: string;
}

interface DriveFolder {
  id: string;
  name: string;
  createdTime: string;
  parentId: string | null;
}

export class GoogleDriveIntegration extends BaseIntegration {
  private apiBase = "https://www.googleapis.com/drive/v3";

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
      await this.apiRequest<{ kind: string }>(`${this.apiBase}/about?fields=kind`, {
        token,
      });
      return {
        healthy: true,
        latency: Date.now() - start,
        message: "Google Drive API is accessible",
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
    const folderId = String(config.folderId ?? "root");

    const files = await this.listFiles(token, folderId);

    return {
      success: true,
      recordsProcessed: files.length,
      recordsCreated: files.length,
      metadata: {
        files: files.length,
        folderId,
        totalSize: files.reduce((sum, f) => sum + (Number(f.size) || 0), 0),
      },
    };
  }

  async action_listFiles(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const folderId = String(params.folderId ?? "root");
    return this.listFiles(token, folderId);
  }

  async action_getFile(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const fileId = String(params.fileId ?? "");

    return this.apiRequest<DriveFile>(
      `${this.apiBase}/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,iconLink,fileExtension`,
      { token }
    );
  }

  async action_createFolder(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));

    return this.apiRequest<DriveFile>(`${this.apiBase}/files`, {
      method: "POST",
      token,
      body: {
        name: params.name,
        mimeType: "application/vnd.google-apps.folder",
        parents: params.parentId ? [String(params.parentId)] : [],
      },
    });
  }

  async action_uploadFile(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));

    const metadata = {
      name: params.name,
      parents: params.parentId ? [String(params.parentId)] : [],
      description: params.description ?? "",
    };

    const formData = JSON.stringify(metadata);

    const response = await fetch(
      `${this.apiBase}/files?uploadType=multipart`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/related",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      throw new Error(`Upload failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  async action_deleteFile(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const fileId = String(params.fileId ?? "");

    await this.apiRequest(`${this.apiBase}/files/${fileId}`, {
      method: "DELETE",
      token,
    });

    return { success: true, fileId };
  }

  async action_searchFiles(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const query = String(params.query ?? "");

    const url = new URL(`${this.apiBase}/files`);
    url.searchParams.set("q", query);
    url.searchParams.set(
      "fields",
      "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)"
    );
    url.searchParams.set("pageSize", String(params.limit ?? 100));

    return this.apiRequest<{ files: DriveFile[] }>(url.toString(), { token });
  }

  async action_exportFile(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const fileId = String(params.fileId ?? "");
    const mimeType = String(params.mimeType ?? "text/plain");

    const response = await fetch(
      `${this.apiBase}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.text();
  }

  async action_getFolderTree(params: Record<string, unknown>): Promise<unknown> {
    const token = await this.getValidToken(String(params.installedId));
    const all: DriveFolder[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${this.apiBase}/files`);
      url.searchParams.set(
        "q",
        "mimeType='application/vnd.google-apps.folder' and trashed=false"
      );
      url.searchParams.set("fields", "nextPageToken,files(id,name,createdTime,parents)");
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const data = await this.apiRequest<{
        files: DriveFile[];
        nextPageToken?: string;
      }>(url.toString(), { token });

      for (const f of data.files) {
        all.push({
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          parentId: f.parents?.[0] ?? null,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return all;
  }

  private async listFiles(
    token: string,
    folderId: string
  ): Promise<DriveFile[]> {
    const all: DriveFile[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${this.apiBase}/files`);
      url.searchParams.set(
        "q",
        `'${folderId}' in parents and trashed=false`
      );
      url.searchParams.set(
        "fields",
        "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,iconLink,fileExtension)"
      );
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const data = await this.apiRequest<{
        files: DriveFile[];
        nextPageToken?: string;
      }>(url.toString(), { token });

      all.push(...data.files);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return all;
  }
}

export const googleDrive = new GoogleDriveIntegration();
