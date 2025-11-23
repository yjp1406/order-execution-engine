import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { ordersRoutes } from "./routes/orders.route";

export const buildApp = () => {
  const app = Fastify({ logger: true });

  app.register(websocket);
  app.register(ordersRoutes, { prefix: "/api/orders" });

  return app;
};
