import { describe, expect, it } from "vitest";
import { hashToken } from "./token-hash";

describe("hashToken", () => {
  it("returns the SHA-256 of the token as 64 lowercase hex characters", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is deterministic for the same token", () => {
    expect(hashToken("header.payload.signature")).toBe(hashToken("header.payload.signature"));
  });

  it("differs for tokens that differ by a single character", () => {
    expect(hashToken("header.payload.signature-a")).not.toBe(hashToken("header.payload.signature-b"));
  });

  it("never contains the token it hashes", () => {
    const token = "header.payload.signature";

    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});
