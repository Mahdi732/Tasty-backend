# Tasty Backend

Tasty backend is a microservices platform for food ordering, verification, restaurant operations, payments, and anti-fraud order controls.

This backend is designed so clients (web/mobile/desktop) call only the API Gateway.

## Services

- `apiGateway` (public REST + websocket entrypoint)
- `userService` (auth, sessions, verification lifecycle)
- `restaurantService` (public listings + manager/admin operations)
- `orderService` (orders, QR flow, driver-arrived, fraud-timer pipeline)
- `paymentService` (order/subscription payments)
- `faceRecognitionService` (face/ID checks)
- `notificationService` (event-driven notifications/realtime)
- `common` (shared protos and infra helpers)

## Core Stack

- Node.js 20
- Express
- gRPC
- MongoDB
- Redis
- RabbitMQ
- Socket.io
- Docker / Docker Compose

## Quick Start (Local)

From `backend/`:

```bash
npm install
docker-compose up --build
```

Then start any local dev service if needed:

```bash
npm run dev:gateway
npm run dev:user
npm run dev:restaurant
npm run dev:order
npm run dev:face
npm run dev:notification
```

## Seed Demo Data

```bash
npm run seed:dev
```

This seeds:
- demo users with different roles/statuses
- restaurants/menu/projections for realistic UI testing

## API Gateway Contract

All frontend calls should target gateway routes under `/api/v1`.

Main groups:
- Auth: `/api/v1/auth/*`
- Activation: `/api/v1/activate-account`
- Restaurants public: `/api/v1/restaurants*`
- Manager: `/api/v1/manager/*`
- Admin restaurant subscription: `/api/v1/admin/restaurants/:id/subscription`
- Orders: `/api/v1/orders*`, `/api/v1/ops/orders*`
- Payments: `/api/v1/payments/*`

See route source of truth:
- `apiGateway/src/routes/api.routes.js`

## Environment Notes

Each service has its own `.env` / `.env.example`.
For production, review:
- `PRODUCTION_ENV_CHECKLIST.md`
- `AUTH_VERIFICATION_MODE_GUIDE.md`

## Scripts

From `backend/`:

```bash
npm run lint
npm run test
npm run seed:dev
```

## Local Ports (default compose)

Infra:
- Mongo user: `27017`
- Mongo restaurant: `27019`
- Mongo order: `27020`
- Redis: `6379`
- RabbitMQ: `5672`
- RabbitMQ UI: `15672`

Services:
- Gateway HTTPS: `443`
- Gateway HTTP (dev): `8080`
- userService: `4000`
- restaurantService: `4010`
- orderService: `4020`
- faceRecognitionService: `4030`
- paymentService: `4050`
- notificationService: `4060`

## QA / Testing Entry Points

- Frontend smoke: sign-up/sign-in/verify -> restaurant browse -> checkout -> orders
- Ops smoke: QR scan + driver-arrived in ops console
- Manager smoke: abonnement -> draft restaurant -> menu/category operations

Postman guidance and import files:
- `POSTMAN_TESTING_GUIDE.md`
- `postman/Tasty_API_Gateway.postman_collection.json`
- `postman/Tasty_Local.postman_environment.json`

## Deployment

Render blueprint and deployment artifacts:
- `render.yaml`
- `.github/workflows/main_deploy.yml`

## Additional Technical Docs

- Deep architecture and lifecycle analysis: `AnalysisReadme.md`
- Frontend auth endpoint review: `FRONTEND_AUTH_ENDPOINTS_REVIEW.md`

## Important Rule For Contributors

Do not bypass API Gateway in frontend clients.
Service-internal endpoints are private contracts and may change without notice.
