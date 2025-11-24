# 🏦 Order Execution Engine
# Real-time order routing engine with Fastify, BullMQ, Redis (Active Orders), Postgres (Order History), and WebSockets

This project implements a high-performance order execution backend similar to a lightweight DEX aggregator.
It receives swap orders, queues them, finds the best route (Raydium or Meteora), executes a mock swap, and streams real-time updates to clients via WebSockets.

# 🚀 Features
# Fastify API
- Low-latency HTTP server
- Structured logging (request logs, error logs)

# BullMQ Queue + Redis
- Redis stores:
    - Job queue (order-queue)
- Active order state (active_order:<orderId>) for real-time WS updates
- Worker processes jobs with retry & exponential backoff.

# PostgreSQL for Persistent Order History
- Stores full order lifecycle (routing → building → submitted → confirmed)
- Durable historical record separate from Redis.

# Mock DEX Routing
- Simulates real-world routing logic:
- Get quotes from Raydium & Meteora
- Choose best price
- Execute mock transaction

# WebSocket Live Updates
- Real-time streaming of status:
- pending → routing → building → submitted → confirmed

# Full Jest Test Suite (10 Tests)
- POST endpoint
- Status validation
- Queue insertion
- Worker initialization
- WebSocket initial response
- Redis active order logic
- OrderRepo DB update
- DEX router
- E2E lifecycle tes

# 🧱 Architecture Overview

            ┌─────────────────────────┐
            │      Client / UI        │
            │  (REST + WebSocket)     │
            └─────────────┬───────────┘
                          |
                          ▼
               ┌─────────────────────┐
               │     Fastify API     │
               │ POST /execute       │
               │ WS /execute/ws      │
               └───────────┬─────────┘
                           |
                           ▼
               ┌─────────────────────┐
               │   Redis (BullMQ)    │
               │ order-queue jobs    │
               └───────────┬─────────┘
                           |
                           ▼
            ┌────────────────────────────┐
            │        Worker (BullMQ)     │
            │ - Fetch best route         │
            │ - Execute mock swap        │
            │ - Update status            │
            │ - Broadcast WS             │
            └──────────┬────────────────┘
                       |
                       ▼
          ┌─────────────────────────────┐
          │   Redis Active Orders       │
          │  active_order:<orderId>     │
          └──────────┬──────────────────┘
                     |
                     ▼
        ┌───────────────────────────┐
        │     PostgreSQL Orders     │
        │   Full lifecycle history  │
        └───────────────────────────┘

# 📦 Tech Stack
- Node.js + TypeScript
- Fastify (REST + WebSocket)
- BullMQ (Queue)
- Redis (queue + active_order cache)
- PostgreSQL (persistent order history)
- Jest (testing)
- Docker Compose (local infra)

# ⚙️ Local Setup
# 1️⃣ Clone the repo
- git clone <repo-url>
- cd Order_execution_engine
# 2️⃣ Install dependencies
- npm install
# 3️⃣ Create your env
- cp .env.example .env
# 4️⃣ Start Postgres + Redis
- docker compose up -d
- Check:
    - redis-cli -p 6380 ping     # PONG
    - psql -h localhost -p 5555 -U postgres -c '\l'
# 5️⃣ Start dev server
- npm run dev

# 🧪 Running Tests
# Run Jest:
- npm test

# Youtube Video link
- https://youtu.be/eTv3-ZGF7ps

# Hosted URL for Backend
- https://dashboard.render.com/
- use https://dashboard.render.com/api/order/execute
- use ws://order-execution-engine-obfd.onrender.com/api/orders/execute/ws?orderId=

# Postman Documentation
- https://documenter.getpostman.com/view/32266708/2sB3dHWZ6F
