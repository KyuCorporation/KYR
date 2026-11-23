import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Sem `globals: true` a Testing Library não desmonta sozinha entre os testes.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});
