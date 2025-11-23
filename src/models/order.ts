export type OrderStatus =
  | "pending"
  | "routing"
  | "building"
  | "submitted"
  | "confirmed"
  | "failed";

export interface Order {
  id: string;
  clientOrderId?: string;
  status: OrderStatus;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  dex?: "raydium" | "meteora";
  txHash?: string;
  executedPrice?: number;
  failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
