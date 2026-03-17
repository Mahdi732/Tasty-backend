# Payment Service

Payment processing service for Tasty.

## Features

- HTTP API for subscription and order payments
- MongoDB transaction ledger
- RabbitMQ domain event publisher with tracing headers
- gRPC server with internal-auth interceptor
- Stripe webhook placeholder endpoint

## Endpoints

- POST /api/v1/payments/subscribe
- POST /api/v1/payments/order
- POST /api/v1/payments/webhook
- GET /api/v1/health

## Start

1. Copy .env.example to .env
2. Install dependencies: npm install
3. Run: npm run dev
