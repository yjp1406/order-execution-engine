import { config } from "../config";
import { createClient } from "redis";

export const redis = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    tls: true,
  },
  username: config.redis.username,
  password: config.redis.password,
});

redis.on("error", (err) => console.error("Redis Error:", err));
redis.connect();

export const ActiveOrders = {
  async set(orderId: string, data: any) {
    await redis.set(
      `active_order:${orderId}`,
      JSON.stringify(data),
      { EX: 300 }                    // <- FIXED
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
