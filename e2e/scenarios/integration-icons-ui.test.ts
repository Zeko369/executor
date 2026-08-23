// Cross-target (browser): the add preview's derived icon becomes catalog
// metadata, and the shared integration Edit sheet can replace it with any
// absolute HTTP(S) image URL. The catalog card then renders that saved URL.
import { randomBytes } from "node:crypto";

import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { composePluginApi } from "@executor-js/api/server";
import { openApiHttpPlugin } from "@executor-js/plugin-openapi/api";
import { IntegrationSlug } from "@executor-js/sdk/shared";

import { scenario } from "../src/scenario";
import { Api, Browser, Target } from "../src/services";
import { visit } from "../src/surfaces/browser";

const api = composePluginApi([openApiHttpPlugin()] as const);

scenario(
  "Integration icons · add persists the discovered icon and Edit accepts a remote image URL",
  {},
  Effect.scoped(
    Effect.gen(function* () {
      const target = yield* Target;
      const browser = yield* Browser;
      const { client: makeClient } = yield* Api;
      const identity = yield* target.newIdentity();
      const client = yield* makeClient(api, identity);
      const suffix = randomBytes(4).toString("hex");
      const title = `Strava Icon ${suffix}`;
      const spec = JSON.stringify({
        openapi: "3.0.3",
        info: { title, version: "1.0.0" },
        servers: [{ url: "https://www.strava.com/api/v3" }],
        paths: {
          "/athlete": {
            get: {
              operationId: "getAthlete",
              responses: { "200": { description: "athlete" } },
            },
          },
        },
      });
      const automaticIcon = "https://integrations.sh/logo/strava.com?sz=64";
      const customIcon = new URL("/favicon-32.png", target.baseUrl).toString();
      let createdSlug = "";

      yield* Effect.ensuring(
        Effect.gen(function* () {
          yield* browser.session(identity, async ({ page, step }) => {
            await step("Add an OpenAPI integration whose first server is Strava", async () => {
              await visit(page, "/integrations/add/openapi");
              await page.getByPlaceholder("https://api.example.com/openapi.json").fill(spec);
              const add = page.getByRole("button", { name: "Add integration" });
              await add.waitFor({ timeout: 20_000 });
              await add.click();
              await page.waitForURL(/\/integrations\/[^/?#]+$/, { timeout: 30_000 });
              createdSlug = page.url().match(/\/integrations\/([^/?#]+)/)?.[1] ?? "";
            });

            await step("Edit shows the icon that the add flow persisted", async () => {
              await page.getByRole("button", { name: "Edit" }).click();
              const iconInput = page.getByLabel("Icon URL");
              await iconInput.waitFor();
              expect(
                await iconInput.inputValue(),
                "the Strava preview icon survived creation",
              ).toBe(automaticIcon);
              const labelBox = await page
                .locator('label[for="integration-icon-url"]')
                .boundingBox();
              const inputBox = await iconInput.boundingBox();
              expect(labelBox, "the icon label is visible").not.toBeNull();
              expect(inputBox, "the icon input is visible").not.toBeNull();
              expect(
                Math.abs((labelBox?.x ?? 0) - (inputBox?.x ?? 0)),
                "the icon input stays aligned with its label",
              ).toBeLessThan(2);
            });

            await step("Replace the icon with an absolute remote image URL", async () => {
              const iconInput = page.getByLabel("Icon URL");
              await iconInput.fill(customIcon);
              await page.getByRole("button", { name: "Save" }).click();
              await iconInput.waitFor({ state: "hidden", timeout: 20_000 });
            });

            await step("The integrations catalog renders the saved custom icon", async () => {
              await visit(page, "/");
              const entry = page.getByTestId(`integration-entry-${createdSlug}`);
              await entry.waitFor({ timeout: 20_000 });
              const image = entry.locator("img").first();
              await image.waitFor();
              expect(await image.getAttribute("src"), "the catalog uses the edited icon URL").toBe(
                customIcon,
              );
            });
          });

          if (createdSlug.length === 0) return yield* Effect.die("the UI did not create a slug");
          const stored = yield* client.integrations.get({
            params: { slug: IntegrationSlug.make(createdSlug) },
          });
          expect(stored.iconUrl, "the edited icon persists through the public API").toBe(
            customIcon,
          );
        }),
        Effect.gen(function* () {
          if (createdSlug.length > 0) {
            yield* client.openapi
              .removeSpec({ params: { slug: IntegrationSlug.make(createdSlug) } })
              .pipe(Effect.ignore);
          }
        }),
      );
    }),
  ),
);
