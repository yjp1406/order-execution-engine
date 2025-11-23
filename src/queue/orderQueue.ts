import { Queue } from "bullmq";
import { config } from "../config";
import IORedis from "ioredis";

export const connection = new IORedis(config.redisUrl);

export const orderQueue = new Queue("order-queue", {
  connection,
});
