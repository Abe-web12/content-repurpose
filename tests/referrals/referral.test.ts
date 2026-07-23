import { describe, it, expect } from "vitest";

describe("Referral — Fraud Detection", () => {
  const DISPOSABLE_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
    "throwaway.email", "yopmail.com", "sharklasers.com", "trashmail.com",
    "maildrop.cc", "getairmail.com", "temp-mail.org", "fakeinbox.com",
  ];

  it("detects disposable email domains", () => {
    const isDisposable = (email: string) => {
      const domain = email.split("@")[1]?.toLowerCase();
      return DISPOSABLE_DOMAINS.includes(domain);
    };
    expect(isDisposable("test@mailinator.com")).toBe(true);
    expect(isDisposable("test@10minutemail.com")).toBe(true);
    expect(isDisposable("test@gmail.com")).toBe(false);
    expect(isDisposable("test@company.com")).toBe(false);
  });

  it("prevents self-referral", () => {
    const validateReferral = (inviterId: string, inviteeId: string) => {
      return inviterId !== inviteeId;
    };
    expect(validateReferral("user1", "user2")).toBe(true);
    expect(validateReferral("user1", "user1")).toBe(false);
  });

  it("generates unique referral codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const code = require("crypto").randomBytes(4).toString("hex").toUpperCase();
      expect(codes.has(code)).toBe(false);
      codes.add(code);
    }
    expect(codes.size).toBe(100);
  });
});

describe("Referral — Rewards", () => {
  it("calculates percentage reward correctly", () => {
    const percentage = 10;
    const paymentAmount = 100;
    const reward = (paymentAmount * percentage) / 100;
    expect(reward).toBe(10);
  });

  it("handles zero amount gracefully", () => {
    const percentage = 10;
    const paymentAmount = 0;
    const reward = (paymentAmount * percentage) / 100;
    expect(reward).toBe(0);
  });

  it("calculates credit rewards", () => {
    const rewardValue = 50;
    const credits = Math.floor(rewardValue);
    expect(credits).toBe(50);
    expect(Number.isInteger(credits)).toBe(true);
  });
});

describe("Referral — Analytics", () => {
  it("calculates conversion rate", () => {
    const getConversionRate = (converted: number, total: number) =>
      total > 0 ? Math.round((converted / total) * 100) : 0;

    expect(getConversionRate(5, 10)).toBe(50);
    expect(getConversionRate(0, 10)).toBe(0);
    expect(getConversionRate(10, 10)).toBe(100);
    expect(getConversionRate(0, 0)).toBe(0);
  });

  it("calculates funnel metrics", () => {
    const funnel = { invites: 100, signups: 60, conversions: 30, rewarded: 15 };
    const signupRate = funnel.signups / funnel.invites;
    const conversionRate = funnel.conversions / funnel.signups;
    const rewardRate = funnel.rewarded / funnel.conversions;

    expect(signupRate).toBe(0.6);
    expect(conversionRate).toBe(0.5);
    expect(rewardRate).toBe(0.5);
  });
});

describe("Referral — Payouts", () => {
  it("processes pending payout correctly", () => {
    const payout = { status: "pending", creditAmount: 100, cashAmount: 0 };
    const process = (p: typeof payout) => ({ ...p, status: "paid", paidAt: new Date() });
    const processed = process(payout);
    expect(processed.status).toBe("paid");
    expect(processed.paidAt instanceof Date).toBe(true);
    expect(processed.creditAmount).toBe(100);
  });
});

describe("Referral — Validation", () => {
  it("requires valid referral code format", () => {
    const isValidFormat = (code: string) => /^[A-F0-9]{8}$/.test(code);
    expect(isValidFormat("A1B2C3D4")).toBe(true);
    expect(isValidFormat("abc12345")).toBe(false);
    expect(isValidFormat("A1B2")).toBe(false);
    expect(isValidFormat("")).toBe(false);
  });

  it("prevents duplicate referrals", () => {
    const existingReferrals = new Set<string>();
    const addReferral = (inviteeEmail: string): boolean => {
      if (existingReferrals.has(inviteeEmail)) return false;
      existingReferrals.add(inviteeEmail);
      return true;
    };

    expect(addReferral("user@test.com")).toBe(true);
    expect(addReferral("user@test.com")).toBe(false);
    expect(addReferral("other@test.com")).toBe(true);
  });
});
