import "dotenv/config";

import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { customerServiceAgent } from "./agents/customer-service-agent.js";
import { conversationRoutes } from "./routes/conversations.js";


function findProjectRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    const packagePath = resolve(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
        if (manifest.name === "customer-agents") return current;
      } catch {
        // Continue walking when an unrelated package file cannot be parsed.
      }
    }
    current = dirname(current);
  }
  return resolve(start);
}

const stateDirectory = resolve(findProjectRoot(process.cwd()), ".data");
mkdirSync(stateDirectory, { recursive: true });
const storageUrl = pathToFileURL(resolve(stateDirectory, "customer-service.db")).href;
export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: "customer-service-storage",
    url: storageUrl
  }),
  agents: {
    customerServiceAgent
  },
  server: {
    host: "127.0.0.1",
    studioHost: "127.0.0.1",
    studioProtocol: "http",
    studioPort: 4111,
    apiRoutes: conversationRoutes
  }
});
