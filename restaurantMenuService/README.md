# Tasty Restaurant + Menu Service

Production-grade Restaurant + Menu microservice.

## Features
- Multi-tenant restaurant onboarding with mandatory verification + subscription gating
- Public discoverability only for ACTIVE restaurants
- Menu management with OptionGroup/OptionItem normalized collections
- Public menu projection for high-performance reads
- RS256 JWT verification via Auth Service JWKS
- RBAC + strict restaurant scoping
- Soft-delete strategy for future Orders/Payments compatibility

## Run locally
1. Copy `.env.example` to `.env`
2. Start dependencies and service:
   - `docker compose up --build`
3. Health endpoints:
   - `GET http://localhost:4010/health`
   - `GET http://localhost:4010/ready`

## Architecture conclusion (Restaurant + Menu Service)

This service now owns marketplace tenant isolation using restaurant membership mappings.

- Isolation is local to this service (not Auth DB): `RestaurantUser(userId, restaurantId, role)`.
- `userId` is an external identity reference from Auth JWT `sub`.
- No cross-database joins with Auth collections.
- Public customer endpoints remain open to all users without restaurant mapping.

### Roles and responsibilities

- Global roles from Auth JWT:
   - `manager`: can access manager route group.
   - `superadmin`: can access manager routes and bypass restaurant membership checks.
- Restaurant-local roles in `RestaurantUser`:
   - `OWNER`, `MANAGER`, `STAFF` (scoped to a specific restaurant).

Current manager-resource authorization flow:
1. JWT is validated via JWKS.
2. `sub` is mapped to `req.auth.userId`.
3. Manager route middleware checks `RestaurantUser` mapping for `:id` restaurant routes.
4. If mapping missing and user is not `superadmin` → `TENANT_ACCESS_DENIED`.

This supports:
- Marketplace customers (cross-restaurant public access).
- Multi-restaurant managers (same user mapped to multiple restaurants).
- Clear Auth/Restaurant separation of concerns.

### Test alignment

- `tests/integration/manager-scoping.test.js`
   - Validates manager cannot modify another manager's restaurant.
   - Validates one manager can manage multiple restaurants.
- `tests/integration/lifecycle-publish.test.js`
   - Validates publish lifecycle still works under scoped manager access.
- `tests/integration/public-read-active-only.test.js`
   - Validates customer-facing public visibility remains based on ACTIVE status.
