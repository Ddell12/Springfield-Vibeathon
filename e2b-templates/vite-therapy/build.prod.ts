// Read E2B credentials from CLI config and set both env vars
// Template.build needs E2B_ACCESS_TOKEN for auth
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const configPath = join(homedir(), ".e2b", "config.json");
const config = JSON.parse(readFileSync(configPath, "utf-8"));
process.env.E2B_ACCESS_TOKEN = config.accessToken;
process.env.E2B_API_KEY = config.teamApiKey;

import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";

const buildInfo = await Template.build(template, {
  alias: "vite-therapy",
  apiKey: config.teamApiKey,
  cpuCount: 2,
  memoryMB: 2048,
  onBuildLogs: defaultBuildLogger(),
});

console.log("Build complete:", buildInfo);
