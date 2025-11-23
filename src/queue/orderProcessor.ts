import { Worker, Job } from "bullmq";
import { connection } from "./orderQueue";
import { MockDexRouter } from "../dex/mockDexRouter";
import { OrderRepository } from "../db/order.repository";
import { wsManager } from "../websocket/wsManager";
import { OrderStatus } from "../models/order";
import { ActiveOrders } from "../services/activeOrder.service";

// Instantiate services
const dexRouter = new MockDexRouter();
const orderRepo = new OrderRepository();

type OrderJobData = {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
};

// Helper to update DB + Redis + WebSocket
const updateStatus = async (
  orderId: string,
  status: OrderStatus,
  extra: any = {}
) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(`🟦 Updating status → ${orderId}: ${status}`);
  }

  // 1. Update DB
  await orderRepo.updateStatus(orderId, status, extra);

  // 2. Update Redis (active orders)
  await ActiveOrders.set(orderId, {
    orderId,
    status,
    ...extra,
    updatedAt: Date.now(),
  });

  // 3. WS Broadcast
  if (process.env.NODE_ENV !== "test") {
    wsManager.broadcastStatus(orderId, status, extra);
  }

  // Cleanup active orders
  if (status === "confirmed" || status === "failed") {
    await ActiveOrders.remove(orderId);
  }
};

// ------------------------------
// WORKER INITIALIZATION
// ------------------------------

let orderWorker: Worker | null = null;

if (process.env.NODE_ENV !== "test") {
  console.log("🚀 Order Worker Initialized");

  orderWorker = new Worker<OrderJobData>(
    "order-queue",
    async (job: Job<OrderJobData>) => {
      const { orderId, tokenIn, tokenOut, amount } = job.data;

      console.log("🧵 Worker received job:", orderId);

      try {
        // 1. Routing
        await updateStatus(orderId, "routing");

        const bestQuote = await dexRouter.getBestRoute(
          tokenIn,
          tokenOut,
          amount
        );

        // 2. Building transaction
        await updateStatus(orderId, "building", {
          dex: bestQuote.dex,
          quotedPrice: bestQuote.price,
        });

        // 3. Execute (mock)
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

        // 4. Confirmation simulation
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

  // Worker events
  orderWorker.on("completed", (job) => {
    console.log("✅ Job completed:", job.id);
  });

  orderWorker.on("failed", (job, err) => {
    console.error("🔴 Job failed:", job?.id, err);
  });
}

export { orderWorker };

// import { Worker, Job } from "bullmq";
// import { connection } from "./orderQueue";
// import { MockDexRouter } from "../dex/mockDexRouter";
// import { OrderRepository } from "../db/order.repository";
// import { wsManager } from "../websocket/wsManager";
// import { OrderStatus } from "../models/order";
// import { ActiveOrders } from "../services/activeOrder.service";

// // Instantiate services
// const dexRouter = new MockDexRouter();
// const orderRepo = new OrderRepository();

// type OrderJobData = {
//   orderId: string;
//   tokenIn: string;
//   tokenOut: string;
//   amount: number;
// };

// // Helper to update DB + Redis + WebSocket
// const updateStatus = async (
//   orderId: string,
//   status: OrderStatus,
//   extra: any = {}
// ) => {
//   console.log(`🟦 Updating status → ${orderId}: ${status}`);

//   // Update DB
//   await orderRepo.updateStatus(orderId, status, extra);

//   // Update Redis Active Order
//   await ActiveOrders.set(orderId, {
//     orderId,
//     status,
//     ...extra,
//     updatedAt: Date.now(),
//   });

//   // WebSocket broadcast
//   wsManager.broadcastStatus(orderId, status, extra);

//   // Remove from active orders on completion
//   if (status === "confirmed" || status === "failed") {
//     await ActiveOrders.remove(orderId);
//   }
// };

// console.log("🚀 Order Worker Initialized"); // Runs only once

// // MAIN WORKER
// export const orderWorker = new Worker<OrderJobData>(
//   "order-queue",
//   async (job: Job<OrderJobData>) => {
//     const { orderId, tokenIn, tokenOut, amount } = job.data;

//     console.log("🧵 Worker received job:", orderId);

//     try {
//       // 1. Routing
//       await updateStatus(orderId, "routing");

//       const bestQuote = await dexRouter.getBestRoute(tokenIn, tokenOut, amount);

//       // 2. Building transaction
//       await updateStatus(orderId, "building", {
//         dex: bestQuote.dex,
//         quotedPrice: bestQuote.price,
//       });

//       // 3. Execute swap (mock 2–3 seconds)
//       const exec = await dexRouter.executeSwap(
//         bestQuote.dex,
//         tokenIn,
//         tokenOut,
//         amount,
//         bestQuote.price
//       );

//       await updateStatus(orderId, "submitted", {
//         dex: exec.dex,
//         txHash: exec.txHash,
//       });

//       // 4. Confirmation delay
//       await new Promise((res) => setTimeout(res, 500));

//       // 5. Confirmed
//       await updateStatus(orderId, "confirmed", {
//         dex: exec.dex,
//         txHash: exec.txHash,
//         executedPrice: exec.executedPrice,
//       });

//     } catch (err: any) {
//       console.error("❌ Order Worker failed:", err.message);

//       await updateStatus(orderId, "failed", {
//         failureReason: err?.message || "Unknown error",
//       });

//       throw err; // BullMQ retry/backoff
//     }
//   },
//   { connection }
// );

// // Worker events
// orderWorker.on("completed", (job) => {
//   console.log("✅ Job completed:", job.id);
// });

// orderWorker.on("failed", (job, err) => {
//   console.error("🔴 Job failed:", job?.id, err);
// });
