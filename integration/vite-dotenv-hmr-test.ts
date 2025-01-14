import { expect } from "@playwright/test";

import type { Files } from "./helpers/vite.js";
import {
  test,
  createEditor,
  viteConfig,
} from "./helpers/vite.js";

let initialFiles = {
  ".env": `
    ENV_VAR_FROM_DOTENV_FILE=Content from .env file
  `,
  "app/routes/dotenv.tsx": String.raw`
    import { useState, useEffect } from "react";
    import { json } from "@remix-run/node";
    import { useLoaderData } from "@remix-run/react";

    export const loader = () => {
      return json({
        loaderContent: process.env.ENV_VAR_FROM_DOTENV_FILE,
      })
    }

    export default function DotenvRoute() {
      const { loaderContent } = useLoaderData();

      return <>
        <div data-dotenv-route-loader-content>{loaderContent}</div>
      </>
    }
  `,
};

test("Vite / Load context / hmr", async ({ page, viteDev }) => {
  let files: Files = async ({ port }) => ({
    "vite.config.js": await viteConfig.basic({ port }),
    ...initialFiles,
  });
  let { cwd, port } = await viteDev(files);
  let edit = createEditor(cwd);

  await page.goto(`http://localhost:${port}/dotenv`, {
    waitUntil: "networkidle",
  });
  expect(page.errors).toEqual([]);

  let loaderContent = page.locator("[data-dotenv-route-loader-content]");
  await expect(loaderContent).toHaveText("Content from .env file");

  await edit(".env", (contents) =>
    contents.replace(
      "ENV_VAR_FROM_DOTENV_FILE=Content from .env file",
      "ENV_VAR_FROM_DOTENV_FILE=New content from .env file"
    )
  );
  await page.waitForLoadState("networkidle");
  await expect(loaderContent).toHaveText("New content from .env file");

  expect(page.errors).toEqual([]);
});
