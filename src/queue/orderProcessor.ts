import { Worker, Job } from "bullmq";
import { connection } from "./orderQueue";
import { MockDexRouter } from "../dex/mockDexRouter";
import { OrderRepository } from "../db/order.repository";
import { wsManager } from "../websocket/wsManager";
import { OrderStatus } from "../models/order";
import { ActiveOrders } from "../services/activeOrder.service";

const dexRouter = new MockDexRouter();
const orderRepo = new OrderRepository();

type OrderJobData = {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
};

const updateStatus = async (
  orderId: string,
  status: OrderStatus,
  extra: any = {}
) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`🟦 Updating status → ${orderId}: ${status}`);
  }

  await orderRepo.updateStatus(orderId, status, extra);

  await ActiveOrders.set(orderId, {
    orderId,
    status,
    ...extra,
    updatedAt: Date.now(),
  });

  if (process.env.NODE_ENV !== "test") {
    wsManager.broadcastStatus(orderId, status, extra);
  }

  if (status === "confirmed" || status === "failed") {
    await ActiveOrders.remove(orderId);
  }
};


let orderWorker: Worker | null = null;

if (process.env.NODE_ENV !== "test") {
  console.log("🚀 Order Worker Initialized");

  orderWorker = new Worker<OrderJobData>(
    "order-queue",
    async (job: Job<OrderJobData>) => {
      const { orderId, tokenIn, tokenOut, amount } = job.data;

      console.log("🧵 Worker received job:", orderId);

      try {
        await updateStatus(orderId, "routing");

        const bestQuote = await dexRouter.getBestRoute(
          tokenIn,
          tokenOut,
          amount
        );

        await updateStatus(orderId, "building", {
          dex: bestQuote.dex,
          quotedPrice: bestQuote.price,
        });

        const exec = await dexRouter.executeSwap(
          bestQuote.dex,
          tokenIn,
          tokenOut,
          amount,
          bestQuote.price
        );

        await updateStatus(orderId, "submitted", {
          dex: exec.dex,
          txHash: exec.txHash,
        });

        await new Promise((res) => setTimeout(res, 500));

        await updateStatus(orderId, "confirmed", {
          dex: exec.dex,
          txHash: exec.txHash,
          executedPrice: exec.executedPrice,
        });
      } catch (err: any) {
        console.error("❌ Order Worker failed:", err.message);

        await updateStatus(orderId, "failed", {
          failureReason: err?.message || "Unknown error",
        });

        throw err;
      }
    },
    { connection }
  );

  orderWorker.on("completed", (job) => {
    console.log("✅ Job completed:", job.id);
  });

  orderWorker.on("failed", (job, err) => {
    console.error("🔴 Job failed:", job?.id, err);
  });
}

export { orderWorker };
