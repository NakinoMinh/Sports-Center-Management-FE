import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuickAccounts } from "../components/common/QuickAccounts";
import { homeForRole } from "./navigation";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("live API navigation", () => {
  it("opens member management for a center manager", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");

    expect(homeForRole("CENTER_MANAGER")).toBe("/manager/members");
  });

  it("keeps the mock manager package page without an API", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(homeForRole("CENTER_MANAGER")).toBe("/manager/packages");
  });

  it("does not change the other role home pages", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");

    expect(homeForRole("MEMBER")).toBe("/member/membership");
    expect(homeForRole("RECEPTIONIST")).toBe("/receptionist/memberships");
    expect(homeForRole("COACH")).toBe("/coach");
  });
});

describe("demo account shortcuts", () => {
  it("hides mock credentials when the live API is configured", () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5198");

    expect(
      renderToStaticMarkup(<QuickAccounts onSelectAccount={() => undefined} />),
    ).toBe("");
  });

  it("shows mock credentials when running without the API", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(
      renderToStaticMarkup(<QuickAccounts onSelectAccount={() => undefined} />),
    ).toContain("member@sportscenter.com");
  });
});
