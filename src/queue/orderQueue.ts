import { Queue } from "bullmq";
import { config } from "../config";

export const connection = {
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  password: config.redis.password,
  tls: config.redis.tls ? { rejectUnauthorized: false } : undefined,
};

export const orderQueue = new Queue("order-queue", {
  connection,
});
