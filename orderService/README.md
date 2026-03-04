# Tasty Order Service

Standalone Order microservice for Tasty.

## Responsibilities
- Order creation and lifecycle
- Delivery and Presence flows
- QR generation and worker scan validation
- Payment status skeleton and payment event consumption
- RabbitMQ event publishing/consumption

## HTTP API
- `POST /v1/orders/me` create order
- `GET /v1/orders/me` list current user orders
- `GET /v1/orders/restaurant/:restaurantId` list restaurant orders (restaurant-scoped staff/manager access)
- `GET /v1/orders/admin/all` list all orders (superadmin)
- `POST /v1/orders/qr/scan` consume one-time QR and mark order completed

## RabbitMQ integration
- Consumes:
	- `payment.succeeded` -> updates payment status to `PAID`
	- `restaurant.staff.assigned`
	- `restaurant.staff.removed`
- Publishes:
	- `order.created`
	- `order.qr.generated`
	- `order.payment.status.changed`

## Run
- Copy .env.example to .env
- docker compose up --build
