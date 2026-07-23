export interface SandboxConfig {
  maxExecutionTime: number;
  maxOutputLength: number;
  allowedTools: string[];
  deniedActions: string[];
  maxMemoryUsage: number;
}

const DEFAULT_SANDBOX: SandboxConfig = {
  maxExecutionTime: 30000,
  maxOutputLength: 100000,
  allowedTools: ["WEB_SEARCH", "CALCULATOR", "HTTP_REQUEST"],
  deniedActions: ["FILE_SYSTEM_WRITE", "NETWORK_EXEC", "SYSTEM_COMMAND"],
  maxMemoryUsage: 50 * 1024 * 1024,
};

export class Sandbox {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_SANDBOX, ...config };
  }

  validateToolAccess(toolType: string): boolean {
    return this.config.allowedTools.includes(toolType);
  }

  validateOutput(output: string): { valid: boolean; error?: string } {
    if (output.length > this.config.maxOutputLength) {
      return { valid: false, error: "Output exceeds maximum length" };
    }
    return { valid: true };
  }

  wrapExecution<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Execution timeout")), this.config.maxExecutionTime)
      ),
    ]);
  }

  sanitizeInput(input: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        sanitized[key] = value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
