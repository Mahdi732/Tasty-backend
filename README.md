# Tasty Backend Master Audit And DevOps Roadmap

Last updated: 2026-03-11

## API Gateway (Express + gRPC + HTTPS)

`apiGateway` is now the single external entrypoint for backend APIs.

### Gateway Directory Structure

```text
backend/
  apiGateway/
    certs/
      cert.pem
      key.pem
    scripts/
      generate-dev-certs.ps1
      generate-dev-certs.sh
    src/
      config/
        env.js
        logger.js
      grpc/
        clients.js
      middlewares/
        auth.middleware.js
      routes/
        api.routes.js
      app.js
      server.js
    Dockerfile
    package.json
```

### gRPC Contract Location

Shared contracts are under:

- `backend/common/protos/user.proto`
- `backend/common/protos/order.proto`
- `backend/common/protos/restaurant.proto`
- `backend/common/protos/face.proto`
- `backend/common/protos/notification.proto`

### Sample Contract + Implementations

Sample proto:
- `backend/common/protos/order.proto`

Gateway REST -> gRPC translation:
- `backend/apiGateway/src/routes/api.routes.js`
- Example: `POST /api/v1/orders` -> `grpcClients.order.createOrder(...)`

Service gRPC handler implementation:
- `backend/orderService/src/grpc/server.js`
- Example: `CreateOrder` and `MarkDriverArrived` call `orderService` directly.

### HTTPS Local Development

Generate self-signed certificates:

```bash
cd backend/apiGateway
npm run certs:generate
```

Gateway starts HTTPS using:

- `SSL_KEY_PATH`
- `SSL_CERT_PATH`

from `backend/apiGateway/.env`.

### Crucial Face Activation Gate Before Orders

The gateway enforces account and face status before order forwarding:

1. JWT is verified in `backend/apiGateway/src/middlewares/auth.middleware.js`.
2. Middleware requires:
   - `status === ACTIVE`
   - `verification.face === true`
3. Only then does route handler in `backend/apiGateway/src/routes/api.routes.js` forward to order gRPC.

This centralizes enforcement at the edge and prevents non-activated users from reaching order flows.

## Executive Summary
- The backend architecture is strong enough to continue frontend development in parallel.
- Core anti-fraud business logic is implemented across `userService`, `orderService`, `faceRecognitionService`, `restaurantService`, and `notificationService`.
- The system is not production-ready yet due to gaps in API gateway, Kubernetes deployment assets, observability hardening, secrets management, and deeper end-to-end testing.

## 1) Full Project Audit

### 1.1 Microservice True Status

| Service | Status | Why |
|---|---|---|
| `userService` | Partial | 4-gate states and phone OTP flow are implemented, but there is still scaffolded logic (`requestEmailChange`) and several unit tests are placeholders. |
| `faceRecognitionService` | Partial | Core activation/search/compare/blacklist paths exist, but some behavior is still placeholder-level (for example fallback model version naming and limited integration hardening evidence). |
| `orderService` | Partial | Core order/QR expiry/scammer trap is implemented; payment remains intentionally skeleton (`payment-skeleton.service.js`), and integration coverage is still shallow. |
| `restaurantService` | Partial | Menu and ETA logic are implemented (`averagePrepTime`, estimate endpoint), but production concerns (contracts, deep load testing, rollout controls) are still pending. |
| `notificationService` | Partial | Durable BullMQ timer engine and race-condition guard are implemented with unit/integration tests, but external channel providers are still mostly `noop` by configuration and there is no full cross-service E2E suite yet. |
| `common` shared library | Complete (for current scope) | Shared auth/error/request-id/validate middleware is present and wired across services. |

### 1.2 User And Scammer Lifecycle Trace

Target lifecycle: Signup -> ID Upload -> Face Scan -> Phone OTP -> Order -> Driver Arrival -> QR Expiry -> Auto-Ban

| Lifecycle Stage | Current State | Notes |
|---|---|---|
| Signup | Implemented | `register` creates user with pending verification state. |
| Email verification | Implemented | OTP flow exists and transitions status forward. |
| Phone OTP verification | Implemented | 4-digit OTP with throttling, lockouts, and status transition is in place. |
| ID upload + live compare | Implemented | `activate-account` requires `idCardImageBase64` and compares ID to live face before activation. |
| Face scan/activation | Implemented | Face activation and watchlist checks are wired. |
| Order placement | Implemented | Order lifecycle and QR generation exist. |
| Driver arrival event | Implemented | `order.driver.arrived` route/event now exists in `orderService`. |
| 3-minute warning timer | Implemented | `notificationService` warning job emits `timer.3_minutes_left` and warning SMS path. |
| QR expiry handling | Implemented | `order.qr.expired` emission exists in `orderService` and timer path in `notificationService`. |
| Auto-ban/blacklist debtor | Implemented (with caveat) | `orderService` calls face blacklist debtor endpoint; depends on face service availability and robust retries/backoff still needs hardening. |

### 1.3 Ghost Code Audit

Ghost code means discussed behavior not fully implemented or intentionally stubbed.

Confirmed ghost/skeleton areas:
- `userService/src/services/auth.service.js`: `requestEmailChange()` returns `{ scaffolded: true }`.
- `orderService/src/services/payment-skeleton.service.js`: payment remains a placeholder publisher, not a real gateway integration.
- Channel defaults still `noop` in `notificationService` and `userService` unless real provider env config is supplied.
- Several tests remain scaffold-level in `userService` unit suite and do not deeply validate business invariants.
- No full end-to-end test that runs real RabbitMQ + Redis + all services through the complete fraud timeline.

## 2) Gap Analysis For Production Readiness

### 2.1 Reliability And Correctness Gaps
- No global distributed tracing (OpenTelemetry) across service boundaries.
- No standardized dead-letter queue strategy for RabbitMQ consumers.
- Retry/backoff and idempotency policy is inconsistent across external calls.
- No formal event contract versioning policy (schema governance for domain events).
- Limited full-chain integration testing under real infra dependencies.

### 2.2 Security And Compliance Gaps
- Secrets are currently managed via `.env` files; move to a secrets manager for production.
- Rotate any real provider credentials immediately if committed or shared.
- Add centralized audit sink and immutable fraud-event retention policy.
- Add formal PII data lifecycle policy (retention, purge, legal hold).

### 2.3 Platform And Operations Gaps
- No API gateway in front of internal services.
- No Kubernetes manifests/Helm/Kustomize assets yet.
- No production-grade CI/CD with environment promotion gates.
- No SLO dashboard (latency, queue lag, failure rates, timer drift).

## 3) Tech Upgrade Plan

### 3.1 API Gateway Plan

Goal: hide internal services and centralize auth, rate limits, routing, and observability.

Option A: Kong Gateway (recommended fastest path)
- Use Kong as edge entrypoint.
- Route prefixes:
  - `/api/auth/*` -> `userService`
  - `/api/restaurants/*` -> `restaurantService`
  - `/api/orders/*` -> `orderService`
  - `/api/face/*` -> `faceRecognitionService` (internal-only routes restricted)
  - `/api/notifications/*` -> `notificationService` (mostly admin/internal)
- Enable plugins:
  - JWT/OIDC verification
  - Rate limiting per route
  - Request/response logging
  - Correlation ID propagation

Option B: Custom Node/NestJS Gateway
- Build an API gateway service with route aggregation and BFF patterns.
- Pros: custom business orchestration and payload shaping.
- Cons: more code ownership and security maintenance burden.

Recommendation
- Start with Kong for control-plane speed and policy consistency, then add custom gateway/BFF only where needed.

### 3.2 Kubernetes (Minikube) Deployment Plan

Create a `k8s/` folder with:

Core infra manifests:
- `k8s/namespace.yaml`
- `k8s/configmap.backend.yaml`
- `k8s/secrets.backend.yaml`
- `k8s/mongo/deployment.yaml`
- `k8s/mongo/service.yaml`
- `k8s/redis/deployment.yaml`
- `k8s/redis/service.yaml`
- `k8s/rabbitmq/deployment.yaml`
- `k8s/rabbitmq/service.yaml`

Application manifests:
- `k8s/user-service/deployment.yaml`
- `k8s/user-service/service.yaml`
- `k8s/restaurant-service/deployment.yaml`
- `k8s/restaurant-service/service.yaml`
- `k8s/order-service/deployment.yaml`
- `k8s/order-service/service.yaml`
- `k8s/face-recognition-service/deployment.yaml`
- `k8s/face-recognition-service/service.yaml`
- `k8s/python-embedder/deployment.yaml`
- `k8s/python-embedder/service.yaml`
- `k8s/notification-service/deployment.yaml`
- `k8s/notification-service/service.yaml`
- `k8s/kong/deployment.yaml` (or ingress controller)
- `k8s/kong/service.yaml`

Policy and resilience manifests:
- `k8s/hpa/*.yaml` for autoscaling
- `k8s/pdb/*.yaml` for disruption budgets
- `k8s/network-policy/*.yaml` to restrict east-west traffic
- `k8s/ingress/ingress.yaml`

Minimum container probes for each app deployment:
- Liveness: `GET /v1/health`
- Readiness: `GET /v1/health` or `/v1/ready` where available

### 3.3 GitHub Actions CI/CD Plan

Create `.github/workflows/backend-ci-cd.yml` with stages:

1. `test`
- Trigger on push and PR.
- Matrix by service directory.
- Run `npm ci` and `npm test`.
- Optional: run dockerized integration jobs with Redis/RabbitMQ service containers.

2. `build`
- Build Docker images for all services after tests pass.
- Tag images with commit SHA and branch/environment tag.

3. `publish`
- Push images to registry (GHCR or Docker Hub).
- Use OIDC or repository secrets for auth.

4. `deploy` (environment protected)
- Deploy to staging first.
- Require manual approval for production.
- Run smoke checks against gateway endpoints.

Suggested image naming:
- `ghcr.io/<org>/tasty-user-service:<sha>`
- `ghcr.io/<org>/tasty-restaurant-service:<sha>`
- `ghcr.io/<org>/tasty-order-service:<sha>`
- `ghcr.io/<org>/tasty-face-recognition-service:<sha>`
- `ghcr.io/<org>/tasty-notification-service:<sha>`

## 4) Configuration Master Checklist

### 4.1 Current Local Single Command
From `backend/`:

```bash
docker-compose up --build
```

This now starts Mongo, Redis, RabbitMQ, Python embedder, and all five backend services.

### 4.2 Required Production Configuration By Service

`userService`
- DB/cache: `MONGO_URI`, `REDIS_URL`
- Auth: JWT issuer/audience/keys, token hash secret
- Verification: email OTP + phone OTP settings
- Integrations: face service URL/API key, RabbitMQ URL
- Providers: SMTP and SMS provider credentials

`restaurantService`
- DB/cache/event bus: `MONGO_URI`, `REDIS_URL`, `RABBITMQ_URL`
- Auth trust: `JWT_JWKS_URI`, issuer/audience
- Policy toggles: verification requirements and activation gates

`orderService`
- DB/event bus: `MONGO_URI`, `RABBITMQ_URL`
- Auth trust: `JWT_JWKS_URI`, issuer/audience
- QR controls: signing secret, TTL, scan batch params
- Face blacklist bridge: face base URL/API key/tenant

`faceRecognitionService`
- DB/event bus: `MONGO_URI`, `RABBITMQ_URL` if used
- Worker: `PYTHON_EMBEDDER_URL`
- Security: internal API key, threshold tuning

`notificationService`
- DB/cache/event bus: `MONGO_URI`, `REDIS_URL`, `RABBITMQ_URL`
- Timer: queue name, warning and total wait seconds
- Channels: `PUSH_PROVIDER`, `SMS_PROVIDER` and provider credentials

Shared hardening for all services:
- `NODE_ENV=production`
- strict CORS origin list
- request size/time limits
- log level and structured JSON logs
- centralized secret injection (not `.env` in production)

## 5) Final Recommendation

Short answer:
- Yes, start frontend now.
- No, do not call backend production-ready yet.

Recommended execution order:
1. Continue frontend against current backend contracts and gateway-like path conventions.
2. In parallel, complete platform hardening: API gateway + CI/CD + observability baseline.
3. Then ship Kubernetes rollout (staging first, production later).

Decision rationale:
- Business logic and service boundaries are already stable enough for frontend integration.
- Platform controls and operational reliability must be upgraded before real production traffic.

## 6) Immediate Next Actions (Two-Week Plan)

Week 1
1. Add Kong gateway and route policies.
2. Add end-to-end fraud lifecycle test with real RabbitMQ + Redis.
3. Replace `noop` providers in non-dev envs and add secret management.

Week 2
1. Add Kubernetes manifests for infra and all 5 services.
2. Add GitHub Actions test/build/publish pipeline.
3. Add staging deployment + smoke tests + queue lag dashboard.

## 7) Critical Security Note

If any real SMS/API credentials were exposed in local files, shared snippets, or git history, rotate them immediately and replace with newly issued secrets before further testing or deployment.
