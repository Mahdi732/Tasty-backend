# Tasty Backend Services

## Services and default ports
- `userService` (Auth): `http://localhost:4000`
- `restaurantService`: `http://localhost:4010`
- `orderService`: `http://localhost:4020`

## Required JWT alignment
All services must share the same JWT issuer and audience values:

- `userService` signs tokens with `JWT_ISSUER` and `JWT_AUDIENCE`
- `restaurantService` and `orderService` must verify with matching values

Recommended shared values in local development:

- `JWT_ISSUER=tasty-auth-service`
- `JWT_AUDIENCE=tasty-platform`

## RabbitMQ integration
- `restaurantService` publishes restaurant membership events to `tasty.domain.events`
- `orderService` consumes `restaurant.staff.assigned` / `restaurant.staff.removed`
- `orderService` also consumes payment events (`payment.succeeded`)

## Quick connectivity checks
- Auth health: `GET http://localhost:4000/health`
- Restaurant health: `GET http://localhost:4010/health`
- Order health: `GET http://localhost:4020/v1/health`
- Order readiness (Rabbit/Mongo): `GET http://localhost:4020/v1/ready`
