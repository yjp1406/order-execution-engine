import { FastifyInstance, FastifyRequest } from "fastify";
import { WebSocket } from "ws";
import { OrderStatus } from "../models/order";

type WSClient = {
  socket: WebSocket;
};

class WSManager {
  private clients: Map<string, Set<WSClient>> = new Map();

  addClient(orderId: string, client: WSClient) {
    if (!this.clients.has(orderId)) {
      this.clients.set(orderId, new Set());
    }
    this.clients.get(orderId)!.add(client);
    console.log("WS CLIENT ADDED for orderId:", orderId);
  }

  removeClient(orderId: string, client: WSClient) {
    const set = this.clients.get(orderId);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) this.clients.delete(orderId);
  }

  broadcastStatus(orderId: string, status: OrderStatus, payload: any = {}) {
    console.log("WS BROADCAST:", orderId, status);
    const set = this.clients.get(orderId);
    if (!set) return;

    const msg = JSON.stringify({ orderId, status, ...payload });
    for (const client of set) {
      try {
        client.socket.send(msg);
      } catch (e) {
        // ignore
      }
    }
  }
}

export const wsManager = new WSManager();
