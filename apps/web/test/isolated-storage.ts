import { afterEach, beforeEach, vi } from "vitest";

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

/**
 * Gives each test its own in-memory `localStorage`. Node's file-backed one (`--localstorage-file` in
 * `vitest.config.ts`) is shared by every test file running in parallel, so a test that signs in with
 * `setAuthToken` would lose its token whenever another file clears it. Call it first in a `describe`,
 * before any `beforeEach` that touches the token.
 */
export function isolateLocalStorage(): void {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
}
