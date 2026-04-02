import { test as setup } from "@playwright/test";

setup("global setup", async ({}) => {
  // Auth flows are exercised through the app's own sign-in UI in fixtures.ts.
});
