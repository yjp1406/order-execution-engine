export const config = {
  port: Number(process.env.PORT) || 3000,
  redis: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT!),
    username: process.env.REDIS_USERNAME!,
    password: process.env.REDIS_PASSWORD!,
    tls: process.env.REDIS_TLS === "true",
  },
  pg: {
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "postgres",
    database: process.env.PG_DB || "order_engine",
  },
  queue: {
    name: "order-queue",
    concurrency: 10,
    maxRetries: 3,
  },
  mockBasePrice: 10,
};
