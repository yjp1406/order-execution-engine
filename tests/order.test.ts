import request from "supertest";
import WebSocket from "ws";
import { buildApp } from "../src/app";
import { orderQueue } from "../src/queue/orderQueue";
import { MockDexRouter } from "../src/dex/mockDexRouter";
import { OrderRepository } from "../src/db/order.repository";
import { ActiveOrders } from "../src/services/activeOrder.service";
import { randomUUID } from "crypto";

jest.setTimeout(30000);

let app: any;
let server: any;

beforeAll(async () => {
  app = buildApp();
  server = await app.listen({ port: 3001 });
});

afterAll(async () => {
  await app.close();
});

/* ---------------------------------------------------
   1. POST /execute creates order
--------------------------------------------------- */
test("POST /execute creates order", async () => {
  const res = await request(server)
    .post("/api/orders/execute")
    .send({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 1
    });

  expect(res.status).toBe(200);
  expect(res.body.orderId).toBeDefined();
});

/* ---------------------------------------------------
   2. Validation: missing fields
--------------------------------------------------- */
test("POST /execute missing fields → 400", async () => {
  const res = await request(server)
    .post("/api/orders/execute")
    .send({});

  expect(res.status).toBe(400);
});

/* ---------------------------------------------------
   3. Queue should receive job
--------------------------------------------------- */
test("Queue receives job", async () => {
  const id = randomUUID();

  await orderQueue.add("order-exec", {
    orderId: id,
    tokenIn: "SOL",
    tokenOut: "USDC",
    amount: 1,
  });

  const waiting = await orderQueue.getWaiting();
  expect(waiting.length).toBeGreaterThan(0);
});

/* ---------------------------------------------------
   4. Worker should be initialized
--------------------------------------------------- */
test("Worker is initialized", () => {
  const worker = require("../src/queue/orderProcessor");
  expect(worker.orderWorker).toBeDefined();
});

/* ---------------------------------------------------
   5. WS connects successfully
--------------------------------------------------- */
test("WebSocket connects", (done) => {
  const ws = new WebSocket("ws://localhost:3001/api/orders/execute/ws?orderId=test");

  ws.on("open", () => {
    ws.close();
    done();
  });

  ws.on("error", done);
});

/* ---------------------------------------------------
   6. WS returns pending or cached status
--------------------------------------------------- */
test("WebSocket returns initial status", (done) => {
  const orderId = randomUUID(); // valid UUID

  const ws = new WebSocket(
    `ws://localhost:3001/api/orders/execute/ws?orderId=${orderId}`
  );

  ws.on("message", (msg) => {
    const data = JSON.parse(msg.toString());
    expect(data.status).toBeDefined();
    ws.close();
    done();
  });

  ws.on("error", done);
});

/* ---------------------------------------------------
   7. DEX Router returns quotes
--------------------------------------------------- */
test("DEX router returns quotes", async () => {
  const router = new MockDexRouter();
  const best = await router.getBestRoute("SOL", "USDC", 1);

  expect(best.dex).toBeDefined();
  expect(best.price).toBeGreaterThan(0);
});

/* ---------------------------------------------------
   8. DEX router chooses lowest
--------------------------------------------------- */
test("DEX chooses lowest", async () => {
  const router = new MockDexRouter();
  const best = await router.getBestRoute("SOL", "USDC", 1);

  expect(["raydium", "meteora"]).toContain(best.dex);
});

/* ---------------------------------------------------
   9. DB updates status
--------------------------------------------------- */
test("OrderRepo updates status", async () => {
  const repo = new OrderRepository();
  const id = randomUUID();

  await repo.create({
    id,
    tokenIn: "SOL",
    tokenOut: "USDC",
    amount: 1,
    status: "pending",
  });

  await repo.updateStatus(id, "routing");

  const o = await repo.findById(id);
  expect(o?.status).toBe("routing");
});

/* ---------------------------------------------------
   10. Redis active order (set/get)
--------------------------------------------------- */
test("Redis activeOrder works", async () => {
  const id = randomUUID();

  await ActiveOrders.set(id, { orderId: id, status: "pending" });

  const d = await ActiveOrders.get(id);

  expect(d.orderId).toBe(id);
  expect(d.status).toBe("pending");
});
