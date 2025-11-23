import { Pool } from "pg";
import { config } from "../config";

export const pgPool = new Pool(config.pg);
