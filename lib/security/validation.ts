const SUSPICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:/i,
  /vbscript\s*:/i,
  /<[^\s>]*\s+on\w+\s*=/i,
  /[\s'"]*--[\s'"]/i,
  /;\s*drop\s+/i,
  /;\s*delete\s+/i,
  /;\s*truncate\s+/i,
  /'\s*or\s+'/i,
  /'\s*or\s*1\s*=\s*1/i,
  /\$\s*where\s*:/i,
  /\$\s*gte?\s*:/i,
  /\$\s*ne?\s*:/i,
  /<\s*%\s*/i,
  /\{%\s*/i,
  /\$\s*\{\s*/,
];

export class SecurityService {
  static containsSuspiciousContent(input: string): boolean {
    return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/['"]/g, "")
      .replace(/\\/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .trim();
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push("Password must be at least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain an uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Password must contain a lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Password must contain a number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Password must contain a special character");
    return { valid: errors.length === 0, errors };
  }

  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = value.replace(/[\r\n]/g, "").trim();
    }
    return sanitized;
  }
}
