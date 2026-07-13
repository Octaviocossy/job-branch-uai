import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const passwordService = new PasswordService();

  it("hashes a password and verifies it against the original", async () => {
    const hash = await passwordService.hash("supersecret");

    expect(hash).not.toBe("supersecret");
    await expect(passwordService.compare("supersecret", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password against a hash", async () => {
    const hash = await passwordService.hash("supersecret");

    await expect(passwordService.compare("wrong-password", hash)).resolves.toBe(false);
  });
});
