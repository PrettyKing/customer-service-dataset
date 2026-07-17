import "dotenv/config";

import { Mastra } from "@mastra/core/mastra";

import { customerServiceAgent } from "./agents/customer-service-agent.js";


export const mastra = new Mastra({
  agents: {
    customerServiceAgent
  }
});
