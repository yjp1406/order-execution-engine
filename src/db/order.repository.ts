import { pgPool } from "./pg";
import { Order, OrderStatus } from "../models/order";

export class OrderRepository {
  async create(order: Order): Promise<void> {
    const query = `
      INSERT INTO orders (id, client_order_id, status, token_in, token_out, amount, dex, tx_hash, executed_price, failure_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;
    const values = [
      order.id,
      order.clientOrderId || null,
      order.status,
      order.tokenIn,
      order.tokenOut,
      order.amount,
      order.dex || null,
      order.txHash || null,
      order.executedPrice || null,
      order.failureReason || null,
    ];
    await pgPool.query(query, values);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    extra: Partial<Order> = {}
  ): Promise<void> {
    const fields: string[] = ["status = $2"];
    const values: any[] = [id, status];
    let idx = 3;

    if (extra.dex) {
      fields.push(`dex = $${idx++}`);
      values.push(extra.dex);
    }
    if (extra.txHash) {
      fields.push(`tx_hash = $${idx++}`);
      values.push(extra.txHash);
    }
    if (extra.executedPrice) {
      fields.push(`executed_price = $${idx++}`);
      values.push(extra.executedPrice);
    }
    if (extra.failureReason) {
      fields.push(`failure_reason = $${idx++}`);
      values.push(extra.failureReason);
    }

    const query = `
      UPDATE orders
      SET ${fields.join(", ")}, updated_at = now()
      WHERE id = $1
    `;
    await pgPool.query(query, values);
  }

  async findById(id: string): Promise<Order | null> {
    const res = await pgPool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      clientOrderId: row.client_order_id,
      status: row.status,
      tokenIn: row.token_in,
      tokenOut: row.token_out,
      amount: Number(row.amount),
      dex: row.dex,
      txHash: row.tx_hash,
      executedPrice: row.executed_price ? Number(row.executed_price) : undefined,
      failureReason: row.failure_reason || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
