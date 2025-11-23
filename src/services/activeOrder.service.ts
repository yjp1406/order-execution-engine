import Redis from "ioredis";
import { config } from "../config";

export const redis = new Redis(config.redisUrl);

export const ActiveOrders = {
  async set(orderId: string, data: any) {
    await redis.set(
      `active_order:${orderId}`,
      JSON.stringify(data),
      "EX",
      300 // auto-remove after 5 minutes
    );
  },

  async get(orderId: string) {
    const d = await redis.get(`active_order:${orderId}`);
    return d ? JSON.parse(d) : null;
  },

  async remove(orderId: string) {
    await redis.del(`active_order:${orderId}`);
  }
};
