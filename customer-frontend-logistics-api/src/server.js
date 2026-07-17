import "dotenv/config";

import { createApp } from "./app.js";


const host = process.env.HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "3100", 10);
const server = createApp().listen(port, host, () => {
  console.log(`Mock logistics API listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
