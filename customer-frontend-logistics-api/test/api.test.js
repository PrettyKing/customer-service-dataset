import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";


let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
});

test("find shipment by order id", async () => {
  const response = await fetch(`${baseUrl}/api/logistics?orderId=ORD-20260717-001`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.carrier, "顺丰速运");
  assert.equal(body.data.status, "in_transit");
});

test("find pending shipment and return 404", async () => {
  const pending = await fetch(`${baseUrl}/api/orders/ORD-20260717-004/logistics`);
  assert.equal((await pending.json()).data.status, "pending");

  const missing = await fetch(`${baseUrl}/api/logistics?trackingNumber=UNKNOWN`);
  assert.equal(missing.status, 404);
});
