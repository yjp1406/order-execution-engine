// src/dex/mockDexRouter.ts
import { config } from "../config";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export type DexQuote = {
  dex: "raydium" | "meteora";
  price: number;
  fee: number;
};

export type DexExecutionResult = {
  dex: "raydium" | "meteora";
  txHash: string;
  executedPrice: number;
};

export class MockDexRouter {
  private basePrice = config.mockBasePrice;

  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200);
    const price =
      this.basePrice * (0.98 + Math.random() * 0.04); // 0.98 - 1.02
    return { dex: "raydium", price, fee: 0.003 };
  }

  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200);
    const price =
      this.basePrice * (0.97 + Math.random() * 0.05); // 0.97 - 1.02
    return { dex: "meteora", price, fee: 0.002 };
  }

  async getBestRoute(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    const [r, m] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    // For market buy: choose lower price; for sell you might choose higher
    const best = r.price <= m.price ? r : m;
    console.log(
      `[DEX ROUTER] Raydium=${r.price.toFixed(
        4
      )}, Meteora=${m.price.toFixed(4)}, chosen=${best.dex}`
    );
    return best;
  }

  async executeSwap(
    dex: "raydium" | "meteora",
    tokenIn: string,
    tokenOut: string,
    amount: number,
    expectedPrice: number
  ): Promise<DexExecutionResult> {
    await sleep(2000 + Math.random() * 1000); // 2–3 seconds
    // Simulate small deviation from expected
    const executedPrice = expectedPrice * (0.995 + Math.random() * 0.01);
    const txHash = this.generateMockTxHash();
    return { dex, txHash, executedPrice };
  }

  private generateMockTxHash(): string {
    return (
      "0x" +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")
    );
  }
}
