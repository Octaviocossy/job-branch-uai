import { beforeEach, describe, expect, it } from "vitest";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/utilities/auth-token.utility";

describe("auth-token utility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored", () => {
    expect(getAuthToken()).toBeNull();
  });

  it("returns the token that was set", () => {
    setAuthToken("t");

    expect(getAuthToken()).toBe("t");
  });

  it("returns null after the token is cleared", () => {
    setAuthToken("t");
    clearAuthToken();

    expect(getAuthToken()).toBeNull();
  });
});
