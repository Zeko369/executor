import { describe, expect, it } from "@effect/vitest";

import { integrationIconUrlFromUrl, isIntegrationIconUrl } from "./integration";

describe("integration icons", () => {
  it("derives a stable integrations.sh URL from an API endpoint", () => {
    expect(integrationIconUrlFromUrl("https://www.strava.com/api/v3")).toBe(
      "https://integrations.sh/logo/strava.com?sz=64",
    );
  });

  it("does not derive remote icons for local endpoints", () => {
    expect(integrationIconUrlFromUrl("http://localhost:3000/mcp")).toBeNull();
    expect(integrationIconUrlFromUrl("http://127.0.0.1:3000/graphql")).toBeNull();
  });

  it("accepts only absolute HTTP(S) image URLs without embedded credentials", () => {
    expect(isIntegrationIconUrl("https://cdn.example.com/icon.png")).toBe(true);
    expect(isIntegrationIconUrl("http://images.example.com/icon.svg")).toBe(true);
    expect(isIntegrationIconUrl("/icon.png")).toBe(false);
    expect(isIntegrationIconUrl("data:image/svg+xml;base64,abc")).toBe(false);
    expect(isIntegrationIconUrl("https://user:secret@example.com/icon.png")).toBe(false);
  });
});
