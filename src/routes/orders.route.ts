import { FastifyInstance } from "fastify";
import { wsManager } from "../websocket/wsManager";
import { OrderRepository } from "../db/order.repository";
import { orderQueue } from "../queue/orderQueue";
import { v4 as uuidv4 } from "uuid";
import { Order } from "../models/order";
import { ActiveOrders } from "../services/activeOrder.service";

const repo = new OrderRepository();

export async function ordersRoutes(app: FastifyInstance) {
  // ---------------------
  // 1️⃣ POST /execute
  // ---------------------
  app.post("/execute", async (req, reply) => {
    const body = req.body as {
      tokenIn: string;
      tokenOut: string;
      amount: number;
      clientOrderId?: string;
    };

    if (!body?.tokenIn || !body?.tokenOut || !body?.amount) {
      return reply.code(400).send({
        error: "tokenIn, tokenOut, amount are required",
      });
    }

    const orderId = uuidv4();

    const order: Order = {
      id: orderId,
      tokenIn: body.tokenIn,
      tokenOut: body.tokenOut,
      amount: body.amount,
      clientOrderId: body.clientOrderId,
      status: "pending",
    };

    await repo.create(order);
    console.log("ADDING JOB:", orderId);

    await orderQueue.add(
      "order-exec",
      { orderId, tokenIn: body.tokenIn, tokenOut: body.tokenOut, amount: body.amount },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      }
    );

    return reply.send({ orderId });
  });

  // ---------------------
  // 2️⃣ GET /execute/ws  (WebSocket)
  // ---------------------
app.get(
  "/execute/ws",
  { websocket: true },
  async (conn, req) => {
    const { orderId } = req.query as { orderId: string };
    console.log("WS request received with orderId:", orderId);

    if (!orderId) {
      conn.socket.send(JSON.stringify({ error: "orderId query param required" }));
      conn.socket.close();
      return;
    }

    const client = { socket: conn.socket };
    wsManager.addClient(orderId, client);

    const active = await ActiveOrders.get(orderId);

    if (active) {
      conn.socket.send(JSON.stringify(active));
      return;
    }

    // Remove client on disconnect
    conn.socket.on("close", () => {
      wsManager.removeClient(orderId, client);
    });

    // 1️⃣ LOAD CURRENT STATUS FROM DB
    const currentOrder = await repo.findById(orderId);

    if (!currentOrder) {
      conn.socket.send(JSON.stringify({
        orderId,
        status: "failed",
        error: "Order not found"
      }));
    } else {
      conn.socket.send(JSON.stringify({
        orderId,
        status: currentOrder.status,
        dex: currentOrder.dex,
        txHash: currentOrder.txHash,
        executedPrice: currentOrder.executedPrice
      }));
    }
  }
);

}
