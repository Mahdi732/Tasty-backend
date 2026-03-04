# Tasty Order Service

Standalone Order microservice for Tasty.

## Responsibilities
- Order creation and lifecycle
- Delivery and Presence flows
- QR generation and worker scan validation
- Payment status skeleton and payment event consumption
- RabbitMQ event publishing/consumption

## Run
- Copy .env.example to .env
- docker compose up --build
