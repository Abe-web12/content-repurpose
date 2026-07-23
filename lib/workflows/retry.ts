interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export class WorkflowRetry {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions,
    onRetry?: (attempt: number, error: unknown) => void,
  ): Promise<T> {
    const { maxRetries, initialDelay, maxDelay = 60000, backoffFactor = 2 } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          onRetry?.(attempt + 1, error);
          const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  static isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("429") || msg.includes("timeout") || msg.includes("503") || msg.includes("502") || msg.includes("too many")) {
        return true;
      }
    }
    return false;
  }

  static calculateBackoff(attempt: number, baseDelay: number): number {
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, 60000);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
