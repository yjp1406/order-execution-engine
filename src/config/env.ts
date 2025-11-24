import dotenv from "dotenv";

// Only load .env locally
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

export const env = process.env;
