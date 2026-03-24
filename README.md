# Tasty Backend Source of Truth

Last updated: 2026-03-24

This file is the operational guide for the backend: architecture, lifecycle, frontend bridge, Render deployment, CI/CD, and runbook details.

Production env variable checklist:

- PRODUCTION_ENV_CHECKLIST.md

## 1) Where The Analysis Is

You currently have two documentation layers:

- Deep backend technical audit: ../backend/AnalysisReadme.md
- Platform-level architecture and deployment overview: ../README.md

This README is the practical runbook that tells you what to do now to get hosted and stable.

## 2) Backend Structure (Current)

Main backend root:

- apiGateway
- userService
- orderService
- restaurantService
- faceRecognitionService
- notificationService
- paymentService
- common
- docker
- docker-compose.yml

Service isolation and workspace manifest:

- package.json in backend root defines npm workspaces for all services plus common.

Shared package:

- common contains shared gRPC contracts, middleware, and auth interceptors used across services.

## 3) Technology Used In Backend

Runtime and API:

- Node.js 20
- Express
- gRPC with protobuf contracts
- Socket.io (realtime)

Persistence and infra:

- MongoDB (service-scoped databases)
- Redis (caching/rate-limit/queue state)
- RabbitMQ (domain events)

Security and validation:

- JWT / JOSE
- Zod
- Structured logging (Pino)

Build and delivery:

- Docker (all backend services)
- Render Blueprint (render.yaml)
- GitHub Actions workflow (.github/workflows/main_deploy.yml)

## 4) Service Responsibility Map

apiGateway (public):

- The only public backend entrypoint.
- Translates external REST requests into internal service calls.
- Proxies websocket path to notification realtime service.
- Central place for auth boundary and request fan-out.

userService (private):

- Registration, authentication, sessions.
- Verification flow (email/phone/face gating).
- Identity and security lifecycle.

orderService (private):

- Order creation and lifecycle.
- QR generation/expiry flow.
- Fraud/scammer trap timeline orchestration.

restaurantService (private):

- Restaurants, menus, role-scoped operations.
- Manager and administration boundaries.

faceRecognitionService (private):

- Face activation/search/compare.
- Debtor/blacklist checks and identity enforcement.

notificationService (private):

- Async notifications from domain events.
- Timer-driven warning/expiry actions.
- Realtime push path (socket gateway).

paymentService (private):

- Payment domain handlers and event publishing.

common (shared internal package):

- Protos, auth middleware, shared transport contracts.

## 5) End-To-End Lifecycle (How The Backend Actually Works)

Registration to active user:

1. User registers in userService.
2. Email and phone verification complete.
3. Face and ID checks complete through faceRecognitionService.
4. User status becomes active and can use protected ordering flows.

Order and anti-fraud lifecycle:

1. Client sends order request to apiGateway.
2. apiGateway routes to orderService.
3. orderService creates order and QR/timer state.
4. Domain events are emitted via RabbitMQ.
5. notificationService schedules warning and expiry actions.
6. If QR is not consumed in time, expiry/scammer flow executes.
7. Risk and enforcement paths are propagated to relevant services.

Realtime behavior:

- notificationService emits socket events.
- apiGateway exposes websocket path to clients as a single public endpoint.

## 6) Frontend-Backend Bridge (How Front Talks To Back)

Frontend architecture path:

1. web/src/components handles UI.
2. web/src/services handles page/business orchestration.
3. web/src/api calls backend endpoints.
4. All calls go to apiGateway only (public backend endpoint).
5. Internal services stay private and are never called directly from browser/mobile apps.

Why this matters:

- Centralized auth and security checks.
- Internal topology stays hidden.
- You can change service internals without breaking frontend contracts.

## 7) Render Hosting Plan (What You Need To Do Now)

Blueprint file already exists:

- render.yaml

Workflow file already exists:

- .github/workflows/main_deploy.yml

### Step A: Push current code to GitHub

1. Ensure render.yaml is in repo root.
2. Ensure all service Dockerfiles are committed.
3. Push branch to GitHub.

### Step B: Create Blueprint on Render

1. In Render dashboard, create a new Blueprint from your GitHub repo.
2. Select root render.yaml.
3. Confirm services detected:
   - tasty-api-gateway
   - user-service
   - order-service
   - restaurant-service
   - face-recognition-service
   - notification-service
   - payment-service
   - tasty-mongo
   - tasty-rabbitmq
   - tasty-redis

### Step C: Fill required secret env vars

At minimum, provide secure values for gateway and auth-sensitive keys:

- JWT_ISSUER
- JWT_AUDIENCE
- JWT_PUBLIC_KEY
- INTERNAL_SERVICE_SECRET

Then fill service-specific secrets from each .env.example file:

- apiGateway/.env.example
- userService/.env.example
- orderService/.env.example
- restaurantService/.env.example
- faceRecognitionService/.env.example
- notificationService/.env.example
- paymentService/.env.example

Important:

- Do not copy localhost values directly into production.
- Use Render private service hostnames for internal calls.

### Step D: Fix public URLs after first deploy

Update public origin and callback values to real onrender domains:

- CORS origins
- web base URL values
- OAuth callback URLs if enabled
- JWKS/API gateway references

### Step E: Verify health and internal connectivity

1. Confirm apiGateway is publicly reachable.
2. Confirm clients can call apiGateway.
3. Confirm apiGateway can reach private services by internal hostnames.
4. Confirm RabbitMQ, Redis, Mongo are reachable from services.

## 8) CI/CD Flow (GitHub Actions -> Render)

Workflow:

- .github/workflows/main_deploy.yml

On push to main it does:

1. Validate
- npm ci per backend service
- lint where script exists
- tests where script exists

2. Build
- Detects changed files
- Builds Docker images only for changed backend services
- Rebuilds impacted services when common changes

3. Deploy
- Calls Render deploy hooks if corresponding secret exists

Required GitHub secrets:

- RENDER_DEPLOY_HOOK_API_GATEWAY
- RENDER_DEPLOY_HOOK_USER_SERVICE
- RENDER_DEPLOY_HOOK_ORDER_SERVICE
- RENDER_DEPLOY_HOOK_RESTAURANT_SERVICE
- RENDER_DEPLOY_HOOK_FACE_SERVICE
- RENDER_DEPLOY_HOOK_NOTIFICATION_SERVICE
- RENDER_DEPLOY_HOOK_PAYMENT_SERVICE

How to get each value:

- Open each Render service -> Settings -> Deploy Hook -> copy URL -> add to GitHub Secrets.

## 9) Environment And Networking Rules On Render

Public services:

- tasty-web
- tasty-api-gateway

Private services:

- all domain services and stateful infra service containers

Internal communication:

- service-to-service calls use private network hostnames such as user-service:50051.

Data stores:

- Redis is defined as keyvalue service.
- Mongo and RabbitMQ are private docker services with attached disks.

## 10) Local Development Commands

Backend full local stack:

- from backend folder run docker-compose up --build

Per-service local run:

- cd service folder
- npm ci
- npm run dev

Backend workspace validation:

- cd backend
- npm run lint
- npm run test

## 11) Operational Checklist Before Production Traffic

1. Secrets hygiene
- rotate all secrets
- enforce non-default strong values

2. CORS and callback correctness
- remove localhost values
- pin exact production origins

3. Observability
- verify logs, health checks, and correlation ids
- ensure service restart visibility in Render logs

4. Queue safety
- validate RabbitMQ consumers in staging
- test timer and retry behavior under failure

5. Fraud path validation
- run full test scenario from registration to QR expiry and enforcement

## 12) Role Matrix Summary

User:

- account lifecycle and ordering in allowed scopes

Worker:

- operational task actions under assigned scope

Manager:

- restaurant/menu and team operations for allowed restaurants

Superadmin:

- global moderation and platform-level governance

## 13) Known Current Constraints

- Production correctness depends on complete env setup per service.
- Payment flow may still be partial depending on external gateway integration stage.
- Some provider integrations (email/SMS) require real third-party credentials to be fully active.

## 14) Fast Start: Your Exact Next Actions

1. In GitHub, add all Render deploy hook secrets.
2. In Render, create blueprint from render.yaml.
3. Fill all missing env values from .env.example files service by service.
4. Deploy and verify gateway + web first.
5. Run one full lifecycle test end-to-end.

If you want, the next step can be a service-by-service production env template file set with placeholders (safe for commit) so you can fill values faster without missing any variable.
