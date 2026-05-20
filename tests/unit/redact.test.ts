import { describe, expect, it } from "vitest";

import { redactText } from "../../src/core/redact.js";

describe("redactText", () => {
  it("redacts secret-looking assignments while preserving labels", () => {
    const output = redactText([
      "OPENAI_API_KEY=sk-test1234567890abcdef",
      "client_secret: super-secret-value",
      "normal_branch=feature/context-pack"
    ].join("\n"));

    expect(output).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(output).toContain("client_secret: [REDACTED]");
    expect(output).toContain("normal_branch=feature/context-pack");
    expect(output).not.toContain("sk-test1234567890abcdef");
    expect(output).not.toContain("super-secret-value");
  });

  it("does not treat scanner names as secret assignment keys", () => {
    const output = redactText("secretlint: Scanner binary not found.");

    expect(output).toBe("secretlint: Scanner binary not found.");
  });

  it("redacts bearer tokens and common provider token prefixes", () => {
    const output = redactText([
      "Authorization: Bearer ghp_1234567890abcdefghijklmnop",
      "token sk-live_1234567890abcdefghijklmnop"
    ].join("\n"));

    expect(output).toContain("Authorization: Bearer [REDACTED]");
    expect(output).toContain("token [REDACTED]");
    expect(output).not.toContain("ghp_1234567890abcdefghijklmnop");
    expect(output).not.toContain("sk-live_1234567890abcdefghijklmnop");
  });

  it("redacts JWTs, npm tokens, and private key blocks", () => {
    const output = redactText([
      "jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop",
      "//registry.npmjs.org/:_authToken=npm_1234567890abcdefghijklmnop",
      "-----BEGIN PRIVATE KEY-----",
      "secret-line",
      "-----END PRIVATE KEY-----"
    ].join("\n"));

    expect(output).toContain("jwt=[REDACTED]");
    expect(output).toContain("_authToken=[REDACTED]");
    expect(output).toContain("-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END PRIVATE KEY-----");
    expect(output).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(output).not.toContain("npm_1234567890abcdefghijklmnop");
    expect(output).not.toContain("secret-line");
  });
});
