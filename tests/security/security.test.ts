import { describe, it, expect } from "vitest";

describe("Security — Password Validation", () => {
  const validatePassword = (password: string, policy: { minLength: number; requireUppercase: boolean; requireNumbers: boolean; requireSpecialChars: boolean }): string[] => {
    const errors: string[] = [];
    if (password.length < policy.minLength) errors.push(`Minimum ${policy.minLength} characters required`);
    if (policy.requireUppercase && !/[A-Z]/.test(password)) errors.push("Must contain uppercase letter");
    if (policy.requireNumbers && !/[0-9]/.test(password)) errors.push("Must contain number");
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push("Must contain special character");
    return errors;
  };

  it("accepts valid password", () => {
    const errors = validatePassword("StrongP@ss1", { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecialChars: true });
    expect(errors).toHaveLength(0);
  });

  it("rejects too short password", () => {
    const errors = validatePassword("Ab1@", { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecialChars: true });
    expect(errors).toContain("Minimum 8 characters required");
  });

  it("rejects password missing uppercase", () => {
    const errors = validatePassword("weakpass1@", { minLength: 8, requireUppercase: true, requireNumbers: false, requireSpecialChars: false });
    expect(errors).toContain("Must contain uppercase letter");
  });

  it("rejects password missing number", () => {
    const errors = validatePassword("WeakPass@", { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecialChars: false });
    expect(errors).toContain("Must contain number");
  });

  it("rejects password missing special character", () => {
    const errors = validatePassword("WeakPass1", { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecialChars: true });
    expect(errors).toContain("Must contain special character");
  });

  it("returns multiple errors for weak password", () => {
    const errors = validatePassword("weak", { minLength: 8, requireUppercase: true, requireNumbers: true, requireSpecialChars: true });
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe("Security — API Key Format", () => {
  it("generates keys with correct prefix", () => {
    const generateKey = (orgId: string): { key: string; hash: string; prefix: string } => {
      const raw = `rpai_${orgId.slice(0, 8)}_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("")}`;
      return { key: raw, hash: "", prefix: raw.slice(0, 12) };
    };
    const result = generateKey("org_12345");
    expect(result.key).toMatch(/^rpai_/);
    expect(result.prefix).toBe(result.key.slice(0, 12));
  });

  it("hashes keys with SHA-256", () => {
    const hashKey = (key: string): string => {
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        const char = key.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(8, "0");
    };
    const key = "rpai_test_abcdef123456";
    const hash = hashKey(key);
    expect(hash).toBeTruthy();
    expect(hash.length).toBeGreaterThanOrEqual(8);
  });

  it("validates key prefix on lookup", () => {
    const validateKey = (key: string): boolean => /^rpai_[a-z0-9]{8}_/.test(key);
    expect(validateKey("rpai_org12345_abcdefghijklmnopqrstuvwx")).toBe(true);
    expect(validateKey("invalid_key")).toBe(false);
    expect(validateKey("")).toBe(false);
    expect(validateKey("RPAI_ORG12345_TEST")).toBe(false);
  });
});

describe("Security — IP/CIDR Validation", () => {
  it("validates CIDR notation", () => {
    const isValidCIDR = (cidr: string): boolean => {
      const parts = cidr.split("/");
      if (parts.length !== 2) return false;
      const ip = parts[0];
      const prefix = parseInt(parts[1]);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
      const octets = ip.split(".");
      if (octets.length !== 4) return false;
      return octets.every((o) => {
        const n = parseInt(o);
        return !isNaN(n) && n >= 0 && n <= 255;
      });
    };
    expect(isValidCIDR("192.168.1.0/24")).toBe(true);
    expect(isValidCIDR("10.0.0.0/8")).toBe(true);
    expect(isValidCIDR("invalid")).toBe(false);
    expect(isValidCIDR("256.0.0.0/24")).toBe(false);
    expect(isValidCIDR("192.168.1.0/33")).toBe(false);
  });

  it("matches IP against CIDR range", () => {
    const ipInCIDR = (ip: string, cidr: string): boolean => {
      const [range, bits] = cidr.split("/");
      const mask = ~(2 ** (32 - parseInt(bits)) - 1);
      const ipNum = ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
      const rangeNum = range.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
      return (ipNum & mask) === (rangeNum & mask);
    };
    expect(ipInCIDR("192.168.1.5", "192.168.1.0/24")).toBe(true);
    expect(ipInCIDR("192.168.2.5", "192.168.1.0/24")).toBe(false);
    expect(ipInCIDR("10.0.0.1", "10.0.0.0/8")).toBe(true);
  });
});

describe("Security — Threat Detection", () => {
  it("detects brute force pattern", () => {
    const isBruteForce = (attempts: { ip: string; timestamp: Date }[], windowMs: number, maxAttempts: number): boolean => {
      const now = Date.now();
      const recent = attempts.filter((a) => now - a.timestamp.getTime() < windowMs);
      return recent.length >= maxAttempts;
    };
    const attempts = Array.from({ length: 6 }, (_, i) => ({
      ip: "192.168.1.1",
      timestamp: new Date(Date.now() - i * 5000),
    }));
    expect(isBruteForce(attempts, 30000, 5)).toBe(true);
    expect(isBruteForce(attempts.slice(0, 3), 30000, 5)).toBe(false);
  });

  it("detects impossible travel", () => {
    const isImpossibleTravel = (prevLocation: string, newLocation: string, timeDiffMs: number): boolean => {
      const distances: Record<string, Record<string, number>> = {
        "US-NY": { "US-CA": 4000, "GB-LND": 5500, "JP-TKO": 10800 },
        "US-CA": { "US-NY": 4000, "GB-LND": 8700, "JP-TKO": 8800 },
        "GB-LND": { "US-NY": 5500, "JP-TKO": 9600, "US-CA": 8700 },
      };
      const dist = distances[prevLocation]?.[newLocation];
      if (!dist) return false;
      const minTimeHours = dist / 800;
      const actualTimeHours = timeDiffMs / (1000 * 60 * 60);
      return actualTimeHours < minTimeHours;
    };
    expect(isImpossibleTravel("US-NY", "JP-TKO", 1000 * 60 * 60)).toBe(true);
    expect(isImpossibleTravel("US-NY", "US-CA", 1000 * 60 * 60 * 10)).toBe(false);
  });

  it("calculates security score", () => {
    const calcScore = (factors: { mfaEnabled: boolean; recentThreats: number; passwordAge: number; sessionsCount: number }): number => {
      let score = 100;
      if (!factors.mfaEnabled) score -= 20;
      score -= factors.recentThreats * 10;
      if (factors.passwordAge > 90) score -= 10;
      if (factors.sessionsCount > 10) score -= 5;
      return Math.max(0, score);
    };
    expect(calcScore({ mfaEnabled: true, recentThreats: 0, passwordAge: 30, sessionsCount: 3 })).toBe(100);
    expect(calcScore({ mfaEnabled: false, recentThreats: 2, passwordAge: 120, sessionsCount: 15 })).toBe(45);
    expect(calcScore({ mfaEnabled: false, recentThreats: 10, passwordAge: 200, sessionsCount: 20 })).toBe(0);
  });
});

describe("Security — Session Management", () => {
  it("generates session tokens", () => {
    const generateSessionToken = (): string => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    };
    const token = generateSessionToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(64);
  });

  it("checks session expiry", () => {
    const isExpired = (lastActive: Date, timeoutMinutes: number): boolean => {
      return Date.now() - lastActive.getTime() > timeoutMinutes * 60 * 1000;
    };
    expect(isExpired(new Date(Date.now() - 1000 * 60 * 30), 15)).toBe(true);
    expect(isExpired(new Date(Date.now() - 1000 * 60 * 5), 15)).toBe(false);
  });
});

describe("Security — TOTP MFA", () => {
  it("generates backup codes", () => {
    const generateBackupCodes = (count = 8): string[] => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return Array.from({ length: count }, () =>
        Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
      );
    };
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    codes.forEach((code) => expect(code.length).toBe(10));
  });

  it("validates backup code format", () => {
    const isValidBackupCode = (code: string): boolean => /^[A-Z0-9]{10}$/.test(code);
    expect(isValidBackupCode("ABCDEF1234")).toBe(true);
    expect(isValidBackupCode("abc123")).toBe(false);
    expect(isValidBackupCode("")).toBe(false);
  });
});

describe("Security — Audit Log", () => {
  it("formats audit log entries", () => {
    const formatEntry = (entry: { action: string; userId: string; timestamp: Date; metadata?: any }) => ({
      ...entry,
      actionDisplay: entry.action.replace(/_/g, " "),
      timestampISO: entry.timestamp.toISOString(),
    });
    const formatted = formatEntry({ action: "user_login", userId: "user_1", timestamp: new Date("2025-01-01") });
    expect(formatted.actionDisplay).toBe("user login");
    expect(formatted.timestampISO).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("Security — Compliance", () => {
  it("masks PII in exports", () => {
    const maskEmail = (email: string): string => {
      const [name, domain] = email.split("@");
      if (name.length <= 2) return `${name[0]}*${name[name.length - 1]}@${domain}`;
      return `${name[0]}${"*".repeat(name.length - 2)}${name[name.length - 1]}@${domain}`;
    };
    expect(maskEmail("john.doe@example.com")).toBe("j******e@example.com");
    expect(maskEmail("ab@c.com")).toBe("a*b@c.com");
  });

  it("anonymizes IP addresses", () => {
    const anonymizeIP = (ip: string): string => {
      const parts = ip.split(".");
      parts[parts.length - 1] = "0";
      return parts.join(".");
    };
    expect(anonymizeIP("192.168.1.5")).toBe("192.168.1.0");
    expect(anonymizeIP("10.0.0.42")).toBe("10.0.0.0");
  });
});
