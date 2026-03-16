# Tasty Backend Architectural Audit (Transparent, Code-Grounded)

## 1. Scope And Method

This document is a direct audit of the current backend codebase behavior, not aspirational design.

Audit sources were the live service code under:
- `apiGateway/`
- `userService/`
- `orderService/`
- `restaurantService/`
- `faceRecognitionService/`
- `notificationService/`
- `common/`
- `docker-compose.yml`
- `docker/mongo-init/*`

The goal is to answer:
- How the full system actually works end-to-end.
- Why each communication protocol is used.
- How each role behaves and what it can/cannot do.
- Whether manager users can bypass superadmin constraints.
- Where shortcuts, bottlenecks, and trust gaps exist.


## 2. High-Level Anatomy

The backend is a microservice-oriented Node.js system with isolated persistence per service, shared infrastructure, and mixed sync/async communication.

Core services:
- `apiGateway`: single external HTTPS entrypoint, REST facade, JWT verification, gRPC client fan-out, socket proxy, Swagger docs.
- `userService`: identity, auth, JWT issuance, sessions, email/phone verification, face activation gate.
- `restaurantService`: restaurant lifecycle, manager/admin/public APIs, menu management, restaurant staff membership events.
- `orderService`: order lifecycle, QR issuance/scan, payment state updates, scammer trap and debt handling.
- `faceRecognitionService`: face activation/search/verify/id-compare and debtor blacklist registry.
- `notificationService`: order timer enforcement, warning/expiry notifications, realtime socket events.
- `python-embedder`: ML helper backend for embedding and face comparison used by face service.

Shared infra:
- RabbitMQ for domain events.
- Redis for rate limit/cooldown/token reuse markers and BullMQ backing.
- MongoDB per service database.


## 3. Why `docker/` And `common/` Exist

### 3.1 `docker/`

`backend/docker/mongo-init/*.js` contains per-database initialization scripts mounted into each Mongo container by `docker-compose.yml`.

Purpose:
- Create service-scoped application DB users with minimum `readWrite` role.
- Separate app users and auth DB per service (`tasty_user`, `tasty_order`, etc.).

Why this exists:
- Enforces persistence isolation and blast-radius containment.
- Prevents one service credential from transparently owning all data.
- Gives deterministic local bootstrap without manual DB setup.

Example behavior:
- `docker/mongo-init/user-db.js` creates `tasty_user_app` for `tasty_user` only.
- `docker/mongo-init/order-db.js` creates `tasty_order_app` for `tasty_order` only.

### 3.2 `common/`

`backend/common` is a shared internal package for cross-service primitives that must stay consistent.

Includes:
- Shared middleware factories (`auth`, `request-id`, validation/error wrappers).
- gRPC internal auth interceptor and metadata key contract.
- Request tracing context propagation helper.
- Shared protobuf contracts (`common/protos/*.proto`).

Why this exists:
- Avoids copy-paste drift in core security and transport conventions.
- Keeps metadata keys and middleware behavior uniform across services.
- Allows the gateway and services to speak stable contracts.

Without `common`, each service would hand-roll auth metadata keys and protocol contracts, increasing mismatch risk.


## 4. Docker Compose Topology And Data Isolation

From `backend/docker-compose.yml`, each domain service gets its own database container and credentials:
- `user-service` -> `user-db` (`tasty_user`)
- `order-service` -> `order-db` (`tasty_order`)
- `restaurant-service` -> `restaurant-db` (`tasty_restaurant`)
- `face-recognition-service` -> `face-db` (`tasty_face`)
- `notification-service` -> `notification-db` (`tasty_notification`)

This is intentional domain boundary enforcement, not over-engineering. It lets each service evolve schema independently and reduces accidental tight coupling through shared tables.

Additional composition details:
- `api-gateway` exposes external HTTPS (`443`).
- Realtime socket backend is `notification-service` at `SOCKET_PORT=4003`, proxied by gateway `/socket.io`.
- Gateway also forwards some auth HTTP routes directly to user-service via `USER_HTTP_BASE_URL`.


## 5. Communication Matrix And Protocol Rationale

### 5.1 REST At The Edge (Client -> Gateway)

Used for:
- Public and authenticated API consumption by web/mobile/desktop clients.
- Human-facing contracts documented with Swagger.

Why REST here:
- Ubiquitous client support.
- Easy auth header/cookie handling.
- Fits OpenAPI documentation and browser test tooling.

Not overkill because this is the only public API surface.

### 5.2 gRPC For Internal Sync Calls (Gateway -> Services, Service -> Service)

Used for:
- `apiGateway` to user/order/restaurant/face/notification synchronous operations.
- Low-latency request/response internal boundaries.

Why gRPC here:
- Typed proto contracts in `common/protos`.
- Smaller payload and lower overhead than repeated internal REST.
- Strongly defined method signatures for cross-team evolution.

Not overkill because all critical sync workflows already cross service boundaries and benefit from stable contracts.

### 5.3 RabbitMQ For Async Domain Events

Used for:
- Decoupled state transitions and side effects.
- Order/payment/restaurant/notification workflows where eventual consistency is acceptable.

Why RabbitMQ here:
- Durable topic exchange semantics and queue fanout.
- Allows services to evolve independently without hard synchronous dependency.
- Enables timer workflows and delayed processing around driver arrival and QR expiry.

Not overkill because timer enforcement and fraud response are event-native workflows.

### 5.4 Socket.io For User Realtime Updates

Used for:
- Timer warning/expiry push to specific user room.
- Events like `timer.update` and `order.expired` emitted by notification service.

Why Socket.io here:
- Realtime UX requirement with room-based targeting.
- Works across web/mobile clients where polling would be slower and noisier.
- Gateway proxy preserves single public endpoint (`/socket.io`).

Not overkill because these events are user-facing, time-sensitive, and periodic.


## 6. Service-By-Service Behavioral Mapping

### 6.1 API Gateway

Responsibilities:
- HTTPS termination and request correlation (`x-request-id`, `x-correlation-id`).
- JWT verification and auth context construction.
- REST facade over gRPC clients.
- Fraud guard at edge for order creation (`ACTIVE` + `face=true`).
- Swagger docs (`/api-docs`, `/api-docs.json`).
- Socket upgrade proxy to notification socket backend.

Important behavioral note:
- Gateway maps auth claims from signed JWT and forwards user context to gRPC metadata.
- It does not mint identity itself.

### 6.2 userService

Owns identity lifecycle and tokens.

Core flows:
1. Register -> `PENDING_EMAIL_VERIFICATION`
2. Email verified -> `PENDING_PHONE_VERIFICATION` (or directly face pending if phone already verified)
3. Phone verified -> `PENDING_FACE_ACTIVATION`
4. Face+ID activation success -> `ACTIVE`

Token behavior:
- Access JWT signed RS256 with claims: `sub`, `roles`, `status`, `verification`, `sid`, `jti`.
- Refresh token rotation with reuse detection and family revocation.

Dev/testing behavior:
- `EXPOSE_VERIFICATION_CODES=true` returns deterministic OTPs (`123456` email, `1234` phone).

Known explicit scaffold:
- `requestEmailChange()` returns scaffold marker (`{ scaffolded: true }`).

### 6.3 restaurantService

Responsibilities:
- Public restaurant browsing/menu/ETA.
- Manager owner workflow: create/update/publish/archive/restore request.
- Staff assignment and role mapping per restaurant.
- Superadmin moderation: verify/unverify/reject/suspend/unsuspend/subscription update.

Activation logic:
- Uses subscription + verification gates to derive visibility/status.
- Public visibility requires active status + active subscription + verified profile.

Event outputs:
- Publishes restaurant lifecycle and staff membership events used by other services.

### 6.4 orderService

Responsibilities:
- Create orders, generate QR token with expiry, track payment/order/debt states.
- Authorize scanner roles for QR scan and driver-arrived operations.
- Consume payment success events.
- Maintain restaurant membership projection from restaurant events.
- Run periodic QR-expiry scammer trap.

Fraud/debt behavior:
- If QR expires unscanned, order marked `EXPIRED`, debt becomes `OUTSTANDING`, risk flags toggled.
- Calls face service blacklist client to mark user as debtor.
- Emits `order.qr.expired` event for downstream notification and monitoring.

### 6.5 faceRecognitionService

Responsibilities:
- Face activation (store identity + embedding).
- Watchlist search (BANNED/DEBTOR) using vector search with cosine fallback.
- Verify face for known person ref.
- Compare ID card face vs live face.
- Blacklist debtor by personRef.

Key business role:
- It is the anti-fraud memory service for list types (`NORMAL`, `DEBTOR`, `BANNED`).

### 6.6 notificationService

Responsibilities:
- Subscribe to `order.driver.arrived`, `order.qr.scanned`, `order.qr.expired`.
- Schedule warning and expiry delayed jobs via BullMQ.
- Emit SMS/push (provider-dependent) and realtime socket updates.
- Keep timer state in Mongo and protect against duplicate or stale sends.

Realtime outputs:
- Warning -> emits `timer.update`
- Expiry -> emits `order.expired`


## 7. End-To-End User Lifecycle (Client To Scammer Trap)

### 7.1 Account Activation Chain

1. Register account in userService.
2. Email OTP verify.
3. Phone OTP verify.
4. Face activation (`/activate-account`) triggers:
   - ID vs live compare
   - watchlist search
   - identity activation
5. User moves to `ACTIVE` and `isFaceVerified=true`.

Order gating:
- Gateway denies order creation unless status is `ACTIVE` and face verification claim is true.

### 7.2 Delivery Fraud Timeline

1. Delivery order created with QR token and expiry.
2. Driver marks arrived -> event emitted.
3. Notification schedules:
   - warning job (3 minutes remaining)
   - expiry job (full wait elapsed)
4. If QR scanned in time -> timer cancelled, no debtor action.
5. If not scanned:
   - order marked expired
   - debt recorded
   - user blacklisted as debtor in face service
   - `order.expired` pushed realtime and optionally SMS.

This is the core anti-scam loop.


## 8. Role Behavioral Mapping

### 8.1 `user` (client customer)

Can:
- Register/login/refresh/logout.
- Verify email/phone.
- Activate account with face + ID.
- Place own orders only after full activation.

Cannot:
- Place orders while non-active or face-unverified.
- Access manager/admin restaurant operations.

### 8.2 `delivery_man`

Can:
- Mark driver arrival for delivery flow.
- Scan delivery QR if membership/role checks pass.

Cannot:
- Execute superadmin moderation routes.
- Operate non-delivery scan paths without proper role context.

### 8.3 `worker` / `staff` / `chef`

Can:
- Manage menu endpoints in manager surface when restaurant access membership exists.
- `chef` can trigger low stock alerts.
- `staff` can scan applicable order QR flows.

Cannot:
- Perform superadmin-only admin moderation.
- Access restaurants where membership mapping is absent.

### 8.4 `manager`

Can:
- Create/manage restaurants, assign staff roles, request publish, archive and restore fee requests.
- Access manager routes only where membership access exists.

Cannot:
- Use superadmin-only admin routes (`verify`, `suspend`, `subscription` updates, etc.).
- Bypass JWT role checks or membership checks without compromising signing keys/secrets.

### 8.5 `superadmin`

Can:
- Access all role-gated admin operations in restaurant service.
- Bypass per-restaurant membership middleware where explicitly coded.
- Access order admin listing route.

Current limitation:
- Superadmin governance is strong in `restaurantService`, but centralized superadmin management APIs in `userService` are not present in current route set.


## 9. Can Manager Bypass Superadmin Constraints?

Short answer: under normal trust assumptions, no.

Why:
1. Role checks are explicit in route middlewares.
2. Manager routes and superadmin routes are separate and protected by `requireRole(...)`.
3. Role claims come from signed JWT issued by userService.
4. JWT is verified at gateway and service boundaries.
5. Restaurant membership checks enforce tenant scope.

For a manager to bypass:
- They would need to forge a valid JWT with `superadmin` role (requires private signing key compromise), or
- Compromise an internal secret/path and call unsecured internal interfaces.

Important caveat:
- Some gRPC servers currently do not enforce the internal service secret interceptor (see section 11), so internal network trust is a real attack surface if a hostile workload can reach those ports.


## 10. Why This Is Not "Overkill"

The architecture looks heavy only if viewed as a CRUD app. Your domain includes identity proofing, fraud control, event timers, and cross-role workflows.

The selected split is justified because:
- Identity, order risk, and face watchlists have different scaling and risk profiles.
- Event-driven timer workflows are naturally asynchronous.
- Fraud enforcement requires auditable transitions across services.
- Independent service DBs reduce accidental side effects.

Where it becomes overkill is not the topology itself, but where operational hardening is incomplete (next section).


## 11. Transparent Gaps, Shortcuts, And Bottlenecks

### 11.1 Security Consistency Gap

`createInternalAuthInterceptor` is robust, but it is not uniformly applied.

Observed:
- `orderService` and `restaurantService` gRPC servers use internal secret interceptor.
- `userService`, `notificationService`, and `faceRecognitionService` gRPC servers do not currently enforce the same internal-secret gate.

Risk:
- A compromised internal network workload may invoke those gRPC endpoints directly.

### 11.2 Eventing Reliability Gap

Rabbit consumers `nack(..., requeue=false)` on errors, but there is no explicit dead-letter queue policy in code-level wiring.

Risk:
- Failed messages can be dropped without durable replay strategy.

### 11.3 Payment Path Is Intentional Skeleton

Order payment integration contains scaffold (`PaymentSkeletonService`) and event shape placeholders.

Risk:
- Payment semantics are not production-grade yet.

### 11.4 Partial Feature Scaffold In User Domain

`requestEmailChange()` remains scaffolded.

Risk:
- Account profile lifecycle is incomplete for production user-management expectations.

### 11.5 Infra Secret Hygiene In Compose

Local compose includes explicit dev credentials inline.

Risk:
- Acceptable for local only; must be replaced by secret manager in non-dev.

### 11.6 Startup Race Sensitivity

Notification startup can race with RabbitMQ readiness (observed during runtime checks).

Risk:
- Transient boot failures unless retry/backoff or health orchestration improves.

### 11.7 Swagger Coverage Is Edge-Centric, Not Full Platform Contract

Gateway docs cover major external paths but not every internal route/event contract.

Risk:
- Teams may assume full platform docs while internal service APIs/events remain tribal knowledge.


## 12. Identity And Authorization Propagation Details

Flow:
1. `userService` signs JWT with claims (`roles`, `status`, `verification`, etc.).
2. `apiGateway` verifies JWT and builds `req.auth`.
3. Gateway gRPC client adds metadata:
   - internal secret
   - userId
   - user roles
   - user status
   - request and correlation ids
4. Internal-auth-enabled gRPC servers validate secret and attach `requestContext`.
5. Service layer then applies role and tenant access checks.

This means role trust originates at userService signing keys and is enforced at edge/service checks.


## 13. Data And State Ownership Map

- userService owns: user identity state, verification state, session and token lifecycle.
- restaurantService owns: restaurant legal/public state and staff membership assignments.
- orderService owns: order/payment/debt/risk flags and QR usage state.
- faceRecognitionService owns: biometric vector identities and watchlist list type.
- notificationService owns: timer state and delayed enforcement execution state.

This ownership map is clean and is the strongest part of the architecture.


## 14. Practical Priority Fixes

1. Apply internal gRPC secret interceptor uniformly to user/face/notification gRPC servers.
2. Add DLQ strategy and explicit retry policy for RabbitMQ consumers.
3. Replace payment skeleton with real provider integration and idempotent reconciliation.
4. Complete scaffolded user profile flows (`requestEmailChange` etc.).
5. Add compose healthchecks and startup retry orchestration for broker dependencies.
6. Expand docs to include event contracts and role matrix as first-class artifacts.


## 15. Final Verdict

Your backend is architecturally serious and logically coherent for a fraud-sensitive food ordering platform.

What is strong now:
- Domain separation and data boundaries.
- Activation and fraud lifecycle design.
- Mixed-protocol use aligned to workload shape.
- Clear role and tenant authorization patterns.

What still blocks production confidence:
- Uneven internal trust enforcement on gRPC.
- Event failure handling maturity.
- Scaffold/skeleton zones in payment and account-profile evolution.

So the system is not fake or decorative; it is a real architecture with real enforcement logic, but it still needs targeted hardening in trust boundaries and reliability mechanics before production-grade deployment.