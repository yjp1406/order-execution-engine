export const config = {
  port: Number(process.env.PORT) || 3000,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  pg: {
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres",
    database: process.env.PG_DB || "order_engine",
  },
  queue: {
    name: "order-queue",
    concurrency: 10, // up to 10 concurrent orders
    maxRetries: 3,
  },
  mockBasePrice: 10, // just a mock number
};
